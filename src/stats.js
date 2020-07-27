const { parse } = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("../babel-traverse/lib/index.js").default;
const { table } = require("table");
const fs = require("fs");

const { parseOptions } = require("./convert.js");

const isFlowComment = comments => {
  if (!comments || comments.length === 0) {
    return false;
  }

  return comments.some(comment => {
    const value = comment.value.trim();
    return value === "@flow" || value.startsWith("$FlowFixMe");
  });
};

const statEmptyFlowFile = ({ body, state }) => {
  let isFlow = false;
  let hasFlowComment = false;

  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];
    isFlow = isFlow || t.isFlow(stmt);
    hasFlowComment =
      hasFlowComment || isFlowComment(stmt.leadingComments || []);
  }

  return hasFlowComment && !isFlow;
};

const statFlowFile = ({ body, state }) => {
  let hasFlowComment = false;

  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];
    hasFlowComment =
      hasFlowComment || isFlowComment(stmt.leadingComments || []);
  }

  return hasFlowComment;
};

const printStats = stats => {
  const config = {
    columns: {
      3: {
        width: 20,
        truncate: 100
      }
    }
  };
  const tableStats = Object.values(stats).map(stat => {
    delete stat.condition;
    return Object.values(stat);
  });
  tableStats.unshift(["Title", "Description", "Value", "Files"]);
  return table(tableStats, config);
};

const getStats = files => {
  const stats = {
    emptyFlowFiles: {
      title: "Empty @flow files",
      description:
        "Number of Flow files containing @flow comment but no type information",
      value: 0,
      files: [],
      condition: statEmptyFlowFile
    },
    flowFiles: {
      title: "@flow files",
      description: "Number of Flow files",
      value: 0,
      files: [],
      condition: statFlowFile
    },
    parseError: {
      title: "Parse Errors",
      description: "Number of errors reported when trying to parse a file",
      value: 0,
      files: [],
      condition: null
    }
  };

  for (const file of files) {
    const inCode = fs.readFileSync(file, "utf-8");
    try {
      const ast = parse(inCode, parseOptions);
      traverse(ast, {
        Program: {
          enter(path, state) {
            Object.keys(stats).forEach(statKey => {
              const { condition } = stats[statKey];
              const { body } = path.node;
              if (body && condition && condition({ body, state })) {
                stats[statKey].value += 1;
                stats[statKey].files.push(file);
              }
            });
          }
        }
      });
    } catch (error) {
      stats.parseError.value += 1;
      stats.parseError.files.push(file);
      console.log(error);
    }
  }

  return printStats(stats);
};

module.exports = getStats;
