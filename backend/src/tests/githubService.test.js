const test = require('node:test');
const assert = require('node:assert/strict');
const GitHubService = require('../services/githubService');

// Mock implementation for Octokit
class MockOctokit {
  constructor(options) {
    this.options = options;
    this.repos = {
      get: this.reposGet.bind(this),
      getContent: this.reposGetContent.bind(this),
      listBranches: this.reposListBranches.bind(this),
      listContributors: this.reposListContributors.bind(this),
      listLanguages: this.reposListLanguages.bind(this),
      getReadme: this.reposGetReadme.bind(this)
    };
    this.git = {
      getTree: this.gitGetTree.bind(this)
    };
    this.actions = {
      listWorkflowRuns: this.actionsListWorkflowRuns.bind(this),
      listWorkflowsForRepo: this.actionsListWorkflowsForRepo.bind(this),
      getWorkflow: this.actionsGetWorkflow.bind(this),
      getWorkflowRunUsage: this.actionsGetWorkflowRunUsage.bind(this)
    };

    // Mock data storage
    this.mockData = {
      repos: {},
      contents: {},
      trees: {},
      workflows: {},
      workflowRuns: {},
      branches: [],
      contributors: [],
      languages: {}
    };
  }

  // Set mock data methods
  setRepoData(owner, repo, data) {
    this.mockData.repos[`${owner}/${repo}`] = data;
  }

  setContentData(owner, repo, path, data) {
    if (!this.mockData.contents[`${owner}/${repo}`]) {
      this.mockData.contents[`${owner}/${repo}`] = {};
    }
    this.mockData.contents[`${owner}/${repo}`][path] = data;
  }

  setTreeData(owner, repo, sha, data) {
    if (!this.mockData.trees[`${owner}/${repo}`]) {
      this.mockData.trees[`${owner}/${repo}`] = {};
    }
    this.mockData.trees[`${owner}/${repo}`][sha] = data;
  }

  setWorkflowsData(owner, repo, data) {
    this.mockData.workflows[`${owner}/${repo}`] = data;
  }

  setWorkflowRunsData(owner, repo, workflowId, data) {
    if (!this.mockData.workflowRuns[`${owner}/${repo}`]) {
      this.mockData.workflowRuns[`${owner}/${repo}`] = {};
    }
    this.mockData.workflowRuns[`${owner}/${repo}`][workflowId] = data;
  }

  setBranchesData(owner, repo, data) {
    this.mockData.branches[`${owner}/${repo}`] = data;
  }

  setContributorsData(owner, repo, data) {
    this.mockData.contributors[`${owner}/${repo}`] = data;
  }

  setLanguagesData(owner, repo, data) {
    this.mockData.languages[`${owner}/${repo}`] = data;
  }

  // Mock implementations
  async reposGet(params) {
    const key = `${params.owner}/${params.repo}`;
    if (this.mockData.repos[key]) {
      return { data: this.mockData.repos[key] };
    }
    // Default mock data
    return {
      data: {
        name: params.repo,
        full_name: `${params.owner}/${params.repo}`,
        description: 'A test repository',
        owner: {
          login: params.owner,
          avatar_url: 'https://avatars.githubusercontent.com/u/123',
          type: 'User'
        },
        stargazers_count: 42,
        forks_count: 7,
        watchers_count: 15,
        open_issues_count: 3,
        size: 1024,
        default_branch: 'main',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z',
        pushed_at: '2023-12-01T00:00:00Z',
        homepage: 'https://example.com',
        license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT', url: 'https://api.github.com/licenses/mit', node_id: 'MDc6TGljZW5zZTEz' },
        topics: ['javascript', 'nodejs']
      }
    };
  }

  async reposGetContent(params) {
    const key = `${params.owner}/${params.repo}`;
    const pathKey = params.path || '';
    if (this.mockData.contents[key] && this.mockData.contents[key][pathKey]) {
      return { data: this.mockData.contents[key][pathKey] };
    }
    // Default mock data for README
    if (pathKey === '' || pathKey.toLowerCase() === 'readme.md') {
      return {
        data: {
          type: 'file',
          encoding: 'base64',
          content: Buffer.from('# Test Repository\n\nThis is a test repository.').toString('base64')
        }
      };
    }
    // Default mock data for package.json
    if (pathKey === 'package.json') {
      return {
        data: {
          type: 'file',
          encoding: 'base64',
          content: Buffer.from(JSON.stringify({
            name: 'test-repo',
            version: '1.0.0',
            dependencies: {}
          })).toString('base64')
        }
      };
    }
    // Default mock data for .github/workflows directory
    if (pathKey === '.github/workflows') {
      return {
        data: [
          {
            type: 'file',
            path: '.github/workflows/ci.yml',
            name: 'ci.yml',
            size: 450
          },
          {
            type: 'file',
            path: '.github/workflows/deploy.yml',
            name: 'deploy.yml',
            size: 380
          }
        ]
      };
    }
    // Simulate 404 for unknown files
    const error = new Error('Not Found');
    error.status = 404;
    throw error;
  }

  async reposListBranches(params) {
    const key = `${params.owner}/${params.repo}`;
    if (this.mockData.branches[key]) {
      return { data: this.mockData.branches[key] };
    }
    // Default mock data
    return {
      data: [
        {
          name: 'main',
          commit: { sha: 'abc123', url: 'https://api.github.com/repos/owner/repo/commits/abc123' },
          protected: true,
          protection: {
            enabled: true,
            required_status_checks: { strict: true, contexts: ['ci/test'] },
            required_pull_request_reviews: { required_approving_review_count: 1 },
            restrictions: null
          }
        },
        {
          name: 'develop',
          commit: { sha: 'def456', url: 'https://api.github.com/repos/owner/repo/commits/def456' },
          protected: false,
          protection: null
        },
        {
          name: 'feature/new-ui',
          commit: { sha: 'ghi789', url: 'https://api.github.com/repos/owner/repo/commits/ghi789' },
          protected: false,
          protection: null
        }
      ]
    };
  }

  async reposListContributors(params) {
    const key = `${params.owner}/${params.repo}`;
    if (this.mockData.contributors[key]) {
      return { data: this.mockData.contributors[key], headers: { link: '<https://api.github.com/repositories/123/contributors?page=4>; rel="last"' } };
    }
    // Default mock data - 4 contributors, so last page is 4
    return {
      data: [
        { login: 'user1', contributions: 45 },
        { login: 'user2', contributions: 32 },
        { login: 'user3', contributions: 18 },
        { login: 'user4', contributions: 7 }
      ],
      headers: { link: '<https://api.github.com/repositories/123/contributors?page=4>; rel="last"' }
    };
  }

  async reposListLanguages(params) {
    const key = `${params.owner}/${params.repo}`;
    if (this.mockData.languages[key]) {
      return { data: this.mockData.languages[key] };
    }
    // Default mock data
    return {
      data: {
        JavaScript: 50000,
        TypeScript: 30000,
        HTML: 10000,
        CSS: 5000
      }
    };
  }

  async reposGetReadme(params) {
    const key = `${params.owner}/${params.repo}`;
    if (this.mockData.contents[key] && this.mockData.contents[key]['']) {
      return { data: this.mockData.contents[key][''] };
    }
    // Default mock data
    return {
      data: {
        name: 'README.md',
        encoding: 'base64',
        content: Buffer.from('# Test Repository\n\nThis is a test repository.').toString('base64')
      }
    };
  }

  async gitGetTree(params) {
    const key = `${params.owner}/${params.repo}`;
    const shaKey = params.tree_sha || 'default';
    if (this.mockData.trees[key] && this.mockData.trees[key][shaKey]) {
      return { data: this.mockData.trees[key][shaKey] };
    }
    // Default mock data
    return {
      data: {
        sha: 'abc123',
        tree: [
          { path: 'README.md', type: 'blob', size: 100 },
          { path: 'package.json', type: 'blob', size: 500 },
          { path: 'src/index.js', type: 'blob', size: 200 },
          { path: 'src/components', type: 'tree' }
        ]
      }
    };
  }

  async actionsListWorkflowsForRepo(params) {
    const key = `${params.owner}/${params.repo}`;
    if (this.mockData.workflows[key]) {
      return { data: this.mockData.workflows[key] };
    }
    // Default mock data
    return {
      data: {
        total_count: 2,
        workflows: [
          {
            id: 12345,
            name: 'CI',
            path: '.github/workflows/ci.yml',
            state: 'active',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-06-01T00:00:00Z',
            html_url: 'https://github.com/owner/repo/.github/workflows/ci.yml',
            badge_url: 'https://github.com/owner/repo/actions/workflows/ci.yml/badge.svg'
          },
          {
            id: 67890,
            name: 'Deploy',
            path: '.github/workflows/deploy.yml',
            state: 'active',
            created_at: '2023-02-01T00:00:00Z',
            updated_at: '2023-06-01T00:00:00Z',
            html_url: 'https://github.com/owner/repo/.github/workflows/deploy.yml',
            badge_url: 'https://github.com/owner/repo/actions/workflows/deploy.yml/badge.svg'
          }
        ]
      }
    };
  }

  async actionsListWorkflowRuns(params) {
    const key = `${params.owner}/${params.repo}`;
    const workflowIdKey = params.workflow_id || 'default';
    if (this.mockData.workflowRuns[key] && this.mockData.workflowRuns[key][workflowIdKey]) {
      return { data: this.mockData.workflowRuns[key][workflowIdKey] };
    }
    // Default mock data
    return {
      data: {
        total_count: 2,
        workflow_runs: [
          {
            id: 1001,
            name: 'CI',
            head_branch: 'main',
            head_sha: 'abc123def456',
            run_number: 10,
            event: 'push',
            status: 'completed',
            conclusion: 'success',
            workflow_id: 12345,
            html_url: 'https://github.com/owner/repo/actions/runs/1001',
            created_at: '2023-06-01T10:00:00Z',
            updated_at: '2023-06-01T10:05:00Z',
            run_started_at: '2023-06-01T10:00:00Z'
          },
          {
            id: 1002,
            name: 'CI',
            head_branch: 'feature/new-feature',
            head_sha: 'def456ghi789',
            run_number: 9,
            event: 'pull_request',
            status: 'in_progress',
            conclusion: null,
            workflow_id: 12345,
            html_url: 'https://github.com/owner/repo/actions/runs/1002',
            created_at: '2023-06-01T09:00:00Z',
            updated_at: '2023-06-01T09:10:00Z',
            run_started_at: '2023-06-01T09:00:00Z'
          }
        ]
      }
    };
  }

  async actionsGetWorkflow(params) {
    // Simplified for testing
    return {
      data: {
        id: params.workflow_id,
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active'
      }
    };
  }

  async actionsGetWorkflowRunUsage(params) {
    // Default mock data
    return {
      data: {
        total_billable: {
          UBUNTU: 10,
          MACOS: 20,
          WINDOWS: 15
        }
      }
    };
  }
}

// Helper to create a fresh GitHubService with mock data
function createGitHubServiceWithMockData() {
  const githubService = new GitHubService('fake-token');
  // Replace the octokit instance with our mock
  githubService.octokit = new MockOctokit({ auth: 'fake-token' });
  return githubService;
}

test('GitHubService - getRepository returns repository metadata', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getRepository('owner', 'test-repo');

  // Assert
  assert.strictEqual(result.name, 'test-repo');
  assert.strictEqual(result.fullName, 'owner/test-repo');
  assert.strictEqual(result.description, 'A test repository');
  assert.strictEqual(result.owner.login, 'owner');
  assert.strictEqual(result.stars, 42);
  assert.strictEqual(result.forks, 7);
  assert.strictEqual(result.watchers, 15);
  assert.strictEqual(result.openIssues, 3);
  assert.strictEqual(result.size, 1024);
  assert.strictEqual(result.defaultBranch, 'main');
});

test('GitHubService - getTree returns file tree', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getTree('owner', 'test-repo', 'main');

  // Assert
  assert.strictEqual(result.sha, 'abc123');
  assert.strictEqual(Array.isArray(result.tree), true);
  assert.strictEqual(result.tree.length, 4);
  assert.strictEqual(result.tree[0].path, 'README.md');
  assert.strictEqual(result.tree[0].type, 'blob');
  assert.strictEqual(result.tree[3].path, 'src/components');
  assert.strictEqual(result.tree[3].type, 'tree');
});

test('GitHubService - getFileContent returns file content', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();
  // Set custom content for a specific file
  githubService.octokit.setContentData('owner', 'test-repo', 'src/index.js', {
    type: 'file',
    size: 25,
    encoding: 'base64',
    content: Buffer.from('console.log("hello");').toString('base64')
  });

  // Act
  const result = await githubService.getFileContent('owner', 'test-repo', 'src/index.js');

  // Assert
  assert.strictEqual(result, 'console.log("hello");');
});

test('GitHubService - getFileContent returns null for large files', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();
  // Set content larger than maxBytes
  githubService.octokit.setContentData('owner', 'test-repo', 'large-file.txt', {
    type: 'file',
    size: 300000, // Larger than default maxBytes (250_000)
    encoding: 'base64',
    content: Buffer.from('x'.repeat(300000)).toString('base64')
  });

  // Act
  const result = await githubService.getFileContent('owner', 'test-repo', 'large-file.txt', { maxBytes: 200_000 });

  // Assert
  assert.strictEqual(result, null);
});

test('GitHubService - getMultipleFiles fetches multiple files concurrently', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();
  // Set custom content for multiple files
  githubService.octokit.setContentData('owner', 'test-repo', 'package.json', {
    type: 'file',
    size: 18,
    encoding: 'base64',
    content: Buffer.from('{"name": "test"}').toString('base64')
  });

  githubService.octokit.setContentData('owner', 'test-repo', 'README.md', {
    type: 'file',
    size: 13,
    encoding: 'base64',
    content: Buffer.from('# Test Repo').toString('base64')
  });

  githubService.octokit.setContentData('owner', 'test-repo', 'src/index.js', {
    type: 'file',
    size: 20,
    encoding: 'base64',
    content: Buffer.from('console.log("test");').toString('base64')
  });

  // Act
  const result = await githubService.getMultipleFiles('owner', 'test-repo',
    ['package.json', 'README.md', 'src/index.js'],
    { maxBytes: 200_000, concurrency: 2 }
  );

  // Assert
  assert.strictEqual(result['package.json'], '{"name": "test"}');
  assert.strictEqual(result['README.md'], '# Test Repo');
  assert.strictEqual(result['src/index.js'], 'console.log("test");');
  assert.strictEqual(Object.keys(result).length, 3);
});

test('GitHubService - getWorkflows returns workflow data', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();
  // Set up mock workflow files (what getWorkflows actually reads)
  githubService.octokit.setContentData('owner', 'test-repo', '.github/workflows/ci.yml', {
    type: 'file',
    size: 450,
    encoding: 'base64',
    content: Buffer.from('name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest').toString('base64')
  });

  githubService.octokit.setContentData('owner', 'test-repo', '.github/workflows/deploy.yml', {
    type: 'file',
    size: 380,
    encoding: 'base64',
    content: Buffer.from('name: Deploy\non: [release]\njobs:\n  deploy:\n    runs-on: ubuntu-latest').toString('base64')
  });

  // Act
  const result = await githubService.getWorkflows('owner', 'test-repo');

  // Assert
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 2);
  // Note: getWorkflows returns filename as 'name', not the workflow name from YAML
  assert.strictEqual(result[0].name, 'ci.yml');
  assert.strictEqual(result[0].path, '.github/workflows/ci.yml');
  assert.strictEqual(result[0].size, 450);
  assert.strictEqual(result[0].content, 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest');

  assert.strictEqual(result[1].name, 'deploy.yml');
  assert.strictEqual(result[1].path, '.github/workflows/deploy.yml');
  assert.strictEqual(result[1].size, 380);
  assert.strictEqual(result[1].content, 'name: Deploy\non: [release]\njobs:\n  deploy:\n    runs-on: ubuntu-latest');
});

test('GitHubService - getWorkflowRuns returns workflow runs', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getWorkflowRuns('owner', 'test-repo', 12345);

  // Assert
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, 1001);
  assert.strictEqual(result[0].name, 'CI');
  assert.strictEqual(result[0].status, 'completed');
  assert.strictEqual(result[0].conclusion, 'success');
  assert.strictEqual(result[1].id, 1002);
  assert.strictEqual(result[1].name, 'CI');
  assert.strictEqual(result[1].status, 'in_progress');
  assert.strictEqual(result[1].conclusion, null);
});

test('GitHubService - getWorkflowRunUsage returns workflow run usage', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getWorkflowRunUsage('owner', 'test-repo', 1001);

  // Assert
  assert.strictEqual(result.UBUNTU, 10);
  assert.strictEqual(result.MACOS, 20);
  assert.strictEqual(result.WINDOWS, 15);
});

test('GitHubService - getLanguages returns language statistics', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getLanguages('owner', 'test-repo');

  // Assert
  assert.strictEqual(result.JavaScript, 50000);
  assert.strictEqual(result.TypeScript, 30000);
  assert.strictEqual(result.HTML, 10000);
  assert.strictEqual(result.CSS, 5000);
});

test('GitHubService - getBranches returns branch list', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getBranches('owner', 'test-repo');

  // Assert
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].name, 'main');
  assert.strictEqual(result[0].protected, true);
  assert.strictEqual(result[1].name, 'develop');
  assert.strictEqual(result[1].protected, false);
  assert.strictEqual(result[2].name, 'feature/new-ui');
  assert.strictEqual(result[2].protected, false);
});

test('GitHubService - getContributorsCount returns contributor count', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getContributorsCount('owner', 'test-repo');

  // Assert
  assert.strictEqual(result, 4);
});

test('GitHubService - getReadme returns readme content', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();

  // Act
  const result = await githubService.getReadme('owner', 'test-repo');

  // Assert
  assert.strictEqual(result.content, '# Test Repository\n\nThis is a test repository.');
  assert.strictEqual(result.name, 'README.md');
});

test('GitHubService - getReadme returns null when not found', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();
  // Override the mock to throw 404
  const originalGetReadme = githubService.octokit.repos.getReadme;
  githubService.octokit.repos.getReadme = async () => {
    const error = new Error('Not Found');
    error.status = 404;
    throw error;
  };

  // Act
  const result = await githubService.getReadme('owner', 'test-repo');

  // Restore original mock
  githubService.octokit.repos.getReadme = originalGetReadme;

  // Assert
  assert.strictEqual(result, null);
});

test('GitHubService - handles API errors appropriately', async () => {
  // Arrange
  const githubService = createGitHubServiceWithMockData();
  // Override the mock to throw an error
  const originalGet = githubService.octokit.repos.get;
  githubService.octokit.repos.get = async () => {
    const error = new Error('Rate limit exceeded');
    error.status = 403;
    throw error;
  };

  // Act & Assert
  await assert.rejects(
    async () => {
      await githubService.getRepository('owner', 'test-repo');
    },
    (err) => {
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.message, 'Rate limit exceeded');
      return true;
    }
  );

  // Restore original mock
  githubService.octokit.repos.get = originalGet;
});