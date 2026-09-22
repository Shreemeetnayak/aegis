/**
 * GitHub Service
 * Handles all GitHub API interactions using Octokit.
 * Separates GitHub data access from analysis logic.
 */
const { Octokit } = require('@octokit/rest');
const { mapWithConcurrency } = require('../utils/asyncPool');

class GitHubService {
  constructor(token = process.env.GITHUB_TOKEN) {
    this.octokit = new Octokit(token ? { auth: token } : {});
  }

  /**
   * Get repository metadata.
   */
  async getRepository(owner, repo) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      owner: { login: data.owner.login, avatar: data.owner.avatar_url, type: data.owner.type },
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      openIssues: data.open_issues_count,
      size: data.size,
      defaultBranch: data.default_branch,
      language: data.language,
      topics: data.topics || [],
      license: data.license ? { name: data.license.name, spdxId: data.license.spdx_id } : null,
      visibility: data.visibility || (data.private ? 'private' : 'public'),
      hasIssues: data.has_issues,
      hasWiki: data.has_wiki,
      hasPages: data.has_pages,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      htmlUrl: data.html_url,
      archived: data.archived,
      disabled: data.disabled,
    };
  }

  /**
   * Get language breakdown (bytes per language).
   */
  async getLanguages(owner, repo) {
    try {
      const { data } = await this.octokit.repos.listLanguages({ owner, repo });
      return data;
    } catch (err) {
      if (err.status === 409) return {};
      throw err;
    }
  }

  /**
   * Get directory contents.
   */
  async getContents(owner, repo, path = '') {
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path });
      return data;
    } catch (err) {
      if (err.status === 404 || err.status === 409) return null;
      throw err;
    }
  }

  /**
   * Get decoded file content. Returns null if file not found.
   */
  async getFileContent(owner, repo, path, { maxBytes = 250_000 } = {}) {
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path });
      if (data.type !== 'file') return null;
      if (data.size && data.size > maxBytes) return null;
      if (data.encoding === 'base64' && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return data.content || null;
    } catch (err) {
      if (err.status === 404 || err.status === 409) return null;
      throw err;
    }
  }

  /**
   * Get full file tree using Git Trees API.
   */
  async getTree(owner, repo, sha) {
    if (!sha) {
      const repoData = await this.octokit.repos.get({ owner, repo });
      sha = repoData.data.default_branch;
    }
    try {
      const { data } = await this.octokit.git.getTree({
        owner, repo, tree_sha: sha, recursive: 'true',
      });
      return {
        sha: data.sha,
        truncated: data.truncated,
        tree: data.tree.map(item => ({
          path: item.path,
          type: item.type, // 'blob' or 'tree'
          size: item.size || 0,
          mode: item.mode,
        })),
      };
    } catch (err) {
      if (err.status === 409) {
        // Empty repository
        return { sha: null, truncated: false, tree: [] };
      }
      throw err;
    }
  }

  /**
   * Get README content decoded.
   */
  async getReadme(owner, repo) {
    try {
      const { data } = await this.octokit.repos.getReadme({ owner, repo });
      if (data.encoding === 'base64' && data.content) {
        return {
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          name: data.name,
          size: data.size,
        };
      }
      return { content: data.content || '', name: data.name, size: data.size };
    } catch (err) {
      if (err.status === 404 || err.status === 409) return null;
      throw err;
    }
  }

  /**
   * Get GitHub Actions workflow files and their contents.
   */
  async getWorkflows(owner, repo, workflowPaths = null) {
    try {
      let candidates = workflowPaths;
      if (!candidates) {
        const contents = await this.getContents(owner, repo, '.github/workflows');
        if (!contents || !Array.isArray(contents)) return [];
        candidates = contents
          .filter((file) => file.name.endsWith('.yml') || file.name.endsWith('.yaml'))
          .map((file) => ({ path: file.path, size: file.size }));
      }

      const workflowRecords = candidates
        .filter((file) => /\.ya?ml$/i.test(file.path))
        .slice(0, 20);
      const contents = await mapWithConcurrency(workflowRecords, 4, async (file) => ({
        ...file,
        content: await this.getFileContent(owner, repo, file.path, { maxBytes: 200_000 }),
      }));

      return contents.map((file) => ({
        name: file.path.split('/').pop(),
        path: file.path,
        size: file.size || 0,
        content: file.content,
      }));
    } catch (err) {
      if (err.status === 404 || err.status === 409) return [];
      throw err;
    }
  }

  /**
   * Get approximate contributor count.
   */
  async getContributorsCount(owner, repo) {
    try {
      const { data, headers } = await this.octokit.repos.listContributors({
        owner, repo, per_page: 1, anon: 'false',
      });
      // Parse Link header for last page to get total count
      const link = headers.link;
      if (link) {
        const match = link.match(/page=(\d+)>;\s*rel="last"/);
        if (match) return parseInt(match[1], 10);
      }
      return data.length;
    } catch {
      return null;
    }
  }

  /**
   * Get branches list.
   */
  async getBranches(owner, repo) {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner, repo, per_page: 100,
      });
      return data.map(b => ({ name: b.name, protected: b.protected }));
    } catch {
      return [];
    }
  }

  /**
   * Get multiple file contents in batch. Returns map of path -> content.
   */
  async getMultipleFiles(owner, repo, paths, { maxBytes = 200_000, concurrency = 5 } = {}) {
    const results = {};
    const fetched = await mapWithConcurrency(paths, concurrency, async (path) => {
      const content = await this.getFileContent(owner, repo, path, { maxBytes });
      if (content !== null) {
        return { path, content };
      }
      return null;
    });
    for (const item of fetched) {
      if (item) results[item.path] = item.content;
    }
    return results;
  }

  /**
   * Get workflow runs for a specific workflow.
   */
  async getWorkflowRuns(owner, repo, workflowId) {
    try {
      const { data } = await this.octokit.actions.listWorkflowRuns({
        owner, repo, workflow_id: workflowId, per_page: 50,
      });
      return data.workflow_runs.map(run => ({
        id: run.id,
        name: run.name,
        headBranch: run.head_branch,
        headSha: run.head_sha,
        runNumber: run.run_number,
        event: run.event,
        status: run.status,
        conclusion: run.conclusion,
        workflowId: run.workflow_id,
        htmlUrl: run.html_url,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        runStartedAt: run.run_started_at,
      }));
    } catch (err) {
      if (err.status === 404 || err.status === 409) return [];
      throw err;
    }
  }

  /**
   * Get workflow run usage (billable minutes).
   */
  async getWorkflowRunUsage(owner, repo, runId) {
    try {
      const { data } = await this.octokit.actions.getWorkflowRunUsage({
        owner, repo, run_id: runId,
      });
      return data.total_billable;
    } catch (err) {
      if (err.status === 404 || err.status === 409) return {};
      throw err;
    }
  }
}

module.exports = GitHubService;