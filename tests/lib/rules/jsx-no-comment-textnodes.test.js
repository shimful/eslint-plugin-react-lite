"use strict";

const { describe, it } = require("node:test");
const rule = require("../../../lib/rules/jsx-no-comment-textnodes.js");

const RuleTester = require("eslint").RuleTester;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2021,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run("jsx-no-comment-textnodes", rule, {
  valid: [
    {
      name: "should allow actual comments",
      code: `
        <div>{/* comment */}</div>;
        <div /* comment */></div>;
        <div className={"foo" /* comment */}></div>;
      `,
    },
  ],
  invalid: [
    {
      name: "should report text content that looks like it was intended to be a comment",
      code: `
        <div>// comment</div>;
        <div>/* comment */</div>;
        <div>
          // comment
        </div>;
        <div>
          /* comment */
        </div>;
      `,
      errors: [
        { messageId: "putCommentInBraces", line: 2 },
        { messageId: "putCommentInBraces", line: 3 },
        { messageId: "putCommentInBraces", line: 4 },
        { messageId: "putCommentInBraces", line: 7 },
      ],
    },
  ],
});
