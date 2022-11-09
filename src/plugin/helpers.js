const importRegex = fileType => [`^(@|ui/${fileType})(/.*|$)`, `^(@|./${fileType})(/.*|$)`, `^(@|${fileType})(/.*|$)`];

module.exports = { importRegex };
