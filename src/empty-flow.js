const { parse } = require("@babel/parser");

const parseOptions = {
  sourceType: "module",
  plugins: [
    // enable jsx
    "jsx",

    // handle esnext syntax
    "classProperties",
    "objectRestSpread",
    "dynamicImport",
    "optionalChaining",
    "nullishCoalescingOperator"
  ]
};

const hasFlowComment = ast =>
  ast.comments.some(comment => comment.value.includes("@flow"));

const isEmptyFlowFile = code => {
  try {
    const ast = parse(code, parseOptions);
    return hasFlowComment(ast);
  } catch (error) {
    return false;
  }
};

module.exports = {
  isEmptyFlowFile,
  hasFlowComment
};
