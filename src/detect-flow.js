const { parse } = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("../babel-traverse/lib/index.js").default;

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

const detectEmptyFlowFile = code => {
  let isFlow = false;
  let hasFlowComment = false;
  const ast = parse(code, parseOptions);

  traverse(ast, {
    Program: {
      enter(path, state) {
        const { body } = path.node;
        for (let i = 0; i < body.length; i++) {
          const stmt = body[i];
          isFlow = isFlow || t.isFlow(stmt);
          hasFlowComment =
            hasFlowComment || isFlowComment(stmt.leadingComments || []);
          hasFlowComment =
            hasFlowComment || isFlowComment(stmt.trailingComments || []);
        }
      }
    }
  });

  return hasFlowComment && !isFlow;
};

module.exports = detectEmptyFlowFile;
