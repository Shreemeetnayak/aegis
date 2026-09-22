const { isSourceFile } = require('./structureAnalyzer');

function analyzeMetrics({ treeEntries, fileContents, languageAnalysis, structure, repository }) {
  const blobs = (treeEntries || []).filter((item) => item.type === 'blob');
  const sourceFiles = blobs.filter((item) => isSourceFile(item.path));
  const directories = structure ? structure.directoryCount : 0;
  const analyzedTextFiles = Object.entries(fileContents || {});
  const sampledSourceLines = analyzedTextFiles
    .filter(([path]) => isSourceFile(path))
    .reduce((sum, [, content]) => sum + countNonEmptyLines(content), 0);

  return {
    totalFiles: blobs.length,
    sourceFiles: sourceFiles.length,
    directoryCount: directories,
    repositorySizeKb: repository && typeof repository.size === 'number' ? repository.size : null,
    languageCount: languageAnalysis ? languageAnalysis.languages.length : 0,
    analyzedTextFiles: analyzedTextFiles.length,
    sampledSourceLines,
    sampledSourceLinesScope: 'Selected source files only; Aegis does not execute or download every repository file.',
  };
}

function countNonEmptyLines(content) {
  return String(content).split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

module.exports = { analyzeMetrics };
