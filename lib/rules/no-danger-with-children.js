"use strict";

module.exports = {
  meta: {
    type: "problem",

    schema: [],

    messages: {
      dangerWithChildren: `Only set either "children" or "props.dangerouslySetInnerHTML", but not both.`,
    },
  },

  create(_context) {
    return {
      JSXElement(_node) {},
    };
  },
};
