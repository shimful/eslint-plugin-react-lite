"use strict";

module.exports = {
  meta: {
    type: "problem",

    schema: [],

    messages: {
      putCommentInBraces: `Comments inside children section of tag should be placed inside braces.`,
    },
  },

  create(context) {
    const COMMENT_REX = /^\s*(\/\/|\/\*)/m;

    return {
      JSXText(node) {
        if (COMMENT_REX.test(node.value)) {
          context.report({ node, messageId: "putCommentInBraces" });
        }
      },
    };
  },
};
