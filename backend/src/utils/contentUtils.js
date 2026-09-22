function entriesFor(fileContents) {
  return Object.entries(fileContents || {}).filter(([, content]) => typeof content === 'string');
}

function getContent(fileContents, path) {
  if (!fileContents || !path) return null;
  if (typeof fileContents[path] === 'string') return fileContents[path];

  const match = Object.entries(fileContents).find(([candidate]) => candidate.toLowerCase() === path.toLowerCase());
  return match && typeof match[1] === 'string' ? match[1] : null;
}

function getContentsByBasename(fileContents, names) {
  const wanted = new Set((Array.isArray(names) ? names : [names]).map((name) => name.toLowerCase()));
  return entriesFor(fileContents)
    .filter(([path]) => wanted.has(path.split('/').pop().toLowerCase()))
    .map(([path, content]) => ({ path, content }));
}

function firstContentByBasename(fileContents, names) {
  return getContentsByBasename(fileContents, names)[0] || null;
}

function parseJson(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function parseJsonFiles(fileContents, names) {
  return getContentsByBasename(fileContents, names)
    .map(({ path, content }) => ({ path, value: parseJson(content) }))
    .filter(({ value }) => value);
}

module.exports = {
  entriesFor,
  getContent,
  getContentsByBasename,
  firstContentByBasename,
  parseJson,
  parseJsonFiles,
};
