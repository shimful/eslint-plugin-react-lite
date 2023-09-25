"use strict";

const { describe, it } = require("node:test");
const rule = require("../../../lib/rules/jsx-key.js");

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

ruleTester.run("jsx-key", rule, {
  valid: [
    {
      name: "should allow array expressions containing elements with keys",
      code: `[<div key="1" />, <div key="2"/>, <div key="3" />]`,
    },
    {
      name: "should ignore values passed to Children.toArray(...) and *.Children.toArray(...)",
      code: `
        Children.toArray([<div />, [1, 2].map(() => <div />)]);
        React.Children.toArray([<div />, [1, 2].map(() => <div />)]);
        Preact.Children.toArray([<div />, [1, 2].map(() => <div />)]);
      `,
    },
  ],
  invalid: [
    {
      name: "should report array expressions containing elements without keys",
      code: `[
          <div />,
          <div key="1" />,
          <div />
        ]`,
      errors: [
        { messageId: "missingElementKey", line: 2 },
        { messageId: "missingElementKey", line: 4 },
      ],
    },
    {
      name: "should report fragment shorthands that need keys when checkFragmentShorthand=true",
      code: `[
        <></>,
        <></>
      ]`,
      options: [
        {
          checkFragmentShorthand: true,
        },
      ],
      errors: [
        {
          line: 2,
          messageId: `missingFragmentKey`,
        },
        {
          line: 3,
          message: `Missing "key" prop for element in array. Shorthand fragment tags do not support key props: use React.Fragment instead.`,
        },
      ],
    },
    {
      name: "should honor the @jsxFrag pragma (over the jsxFragmentFactory setting) when checkFragmentShorthand=true",
      code: `
        /* @jsxFrag Preact.Fragment */
        [
          <></>,
          <></>
        ]
      `,
      settings: { react: { jsxFragmentFactory: "Other.Fragment" } },
      options: [{ checkFragmentShorthand: true }],
      errors: [
        {
          line: 4,
          messageId: `missingFragmentKey`,
        },
        {
          line: 5,
          message: `Missing "key" prop for element in array. Shorthand fragment tags do not support key props: use Preact.Fragment instead.`,
        },
      ],
    },
    {
      name: "should honor the pragma & fragment settings when checkFragmentShorthand=true",
      code: `[
        <></>,
        <></>
      ]`,
      settings: {
        react: {
          pragma: "Preact",
          fragment: "Pfragment",
        },
      },
      options: [{ checkFragmentShorthand: true }],
      errors: [
        {
          line: 2,
          messageId: `missingFragmentKey`,
        },
        {
          line: 3,
          message: `Missing "key" prop for element in array. Shorthand fragment tags do not support key props: use Preact.Pfragment instead.`,
        },
      ],
    },
  ],
});
