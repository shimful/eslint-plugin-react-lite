"use strict";

const { describe, it } = require("node:test");
const rule = require("../../../lib/rules/no-danger-with-children.js");

const RuleTester = require("eslint").RuleTester;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run("no-danger-with-children", rule, {
  valid: [
    {
      name: "should allow elements with a dangerouslySetInnerHTML prop and no children",
      code: `
        <div dangerouslySetInnerHTML={{ __html: "html" }} />
      `,
    },
    {
      name: "should allow elements with children and without a dangerouslySetInnerHTML",
      code: `
        <div>content</div>;
        <div children="content" />;
      `,
    },
    {
      name: "should ignore empty & multi-line whitespace element contents",
      code: `
        <div dangerouslySetInnerHTML={{ __html: "html" }}></div>;
        <div dangerouslySetInnerHTML={{ __html: "html" }}>
        </div>;
        <div dangerouslySetInnerHTML={{ __html: "html" }}>

        </div>;
      `,
    },
    {
      name: "should allow React.createElement with a dangerouslySetInnerHTML prop and no children",
      code: `
        <div dangerouslySetInnerHTML={{ __html: "html" }} />
      `,
    },
    {
      name: "should analyze element spreads",
      code: `
        const p1 = { dangerouslySetInnerHTML: { __html: "html" } };
        <div {...p1} />

        const p2 = { dangerouslySetInnerHTML={{ __html: "html" }}, children: "content" };
        const { children, ...p3 } = p2;
        <div {...p3} />
      `,
    },
    {
      name: "should allow overriding the jsx factory with a setting",
      code: `
        React.crateElement("div", { dangerouslySetInnerHTML: { __html: "html" } }, "content");
      `,
      settings: {
        react: {
          jsxFactory: "h",
        },
      },
    },
    {
      name: "should allow overriding the jsx factory with a pragma",
      code: `
        /* jsx h */
        /* Note: pragma takes precedence over the jsxFactory setting */
        React.crateElement("div", { dangerouslySetInnerHTML: { __html: "html" } }, "content");
      `,
      settings: {
        react: {
          jsxFactory: "React.createElement",
        },
      },
    },
  ],
  invalid: [
    {
      name: "should report elements with children and a dangerouslySetInnerHTML prop",
      code: `
        <div dangerouslySetInnerHTML={{ __html: "html" }}>
          content
        </div>;
        <div dangerouslySetInnerHTML={{ __html: "html" }} children="content" />;
      `,
      errors: [
        { messageId: "dangerWithChildren", line: 2 },
        { messageId: "dangerWithChildren", line: 5 },
      ],
    },
    {
      name: "should consider single-line whitespace as child content",
      code: `
        <div dangerouslySetInnerHTML={{ __html: "html" }}>  </div>
      `,
      errors: [{ messageId: "dangerWithChildren", line: 2 }],
    },
    {
      name: "should not ignore empty & multi-line whitespace element contents when given as a prop",
      code: `
        <div dangerouslySetInnerHTML={{ __html: "html" }} children="" />
        <div dangerouslySetInnerHTML={{ __html: "html" }} children=" \n " />
      `,
      errors: [
        { messageId: "dangerWithChildren", line: 2 },
        { messageId: "dangerWithChildren", line: 3 },
      ],
    },
    {
      name: "should report elements with children and/or dangerouslySetInnerHTML passed in a spread",
      code: `
        <div {...{ dangerouslySetInnerHTML: { __html: "html" } }}>content</div>;

        const p1 = { dangerouslySetInnerHTML: { __html: "html" } };
        <div {...p1}>content</div>

        const p2 = { children: "content" };
        <div dangerouslySetInnerHTML={{ __html: "html" }} {...p2} />

        const p3 = { dangerouslySetInnerHTML: { __html: "html" }, children: "content" };
        <div {...p3} />

        const p4 = { children: "content", ...p4, dangerouslySetInnerHTML: { __html: "html" } };
        <div {...p4} />

        const p5 = { children: "content" };
        const p6 = { ...p5, dangerouslySetInnerHTML: { __html: "html" } };
        <div {...p6} />

        const p7 = { foo: 1, bar: 2, dangerouslySetInnerHTML: { __html: "html" } };
        const { foo, bar, ...p8 } = p7;
        <div {...p8, children: "content" } />
      `,
      errors: [
        { messageId: "dangerWithChildren", line: 2 },
        { messageId: "dangerWithChildren", line: 5 },
        { messageId: "dangerWithChildren", line: 8 },
        { messageId: "dangerWithChildren", line: 11 },
        { messageId: "dangerWithChildren", line: 14 },
        { messageId: "dangerWithChildren", line: 18 },
        { messageId: "dangerWithChildren", line: 22 },
      ],
    },
    {
      name: "should report React.createElement with children and a dangerouslySetInnerHTML prop",
      code: `
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" } }, "content");
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" }, children: "content" });
      `,
      errors: [
        { messageId: "dangerWithChildren", line: 2 },
        { messageId: "dangerWithChildren", line: 3 },
      ],
    },
    {
      name: "should report React.createElement with empty or whitespace children",
      code: `
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" } }, "");
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" } }, " ");
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" } }, " \n ");
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" }, children: "" });
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" }, children: " " });
        React.createElement("div", { dangerouslySetInnerHTML: { __html: "html" }, children: " \n " });
      `,
      errors: [
        { messageId: "dangerWithChildren", line: 2 },
        { messageId: "dangerWithChildren", line: 3 },
        { messageId: "dangerWithChildren", line: 4 },
        { messageId: "dangerWithChildren", line: 5 },
        { messageId: "dangerWithChildren", line: 6 },
        { messageId: "dangerWithChildren", line: 7 },
      ],
    },
    {
      name: "should analyze prop objects passed to React.createElement",
      code: `
        React.createElement("div", {...{ dangerouslySetInnerHTML: { __html: "html" } }}, "content");

        const p1 = { dangerouslySetInnerHTML: { __html: "html" } };
        React.createElement("div", p1, "content");
        React.createElement("div", { ...p1, children: "content" });

        const { foo, ...p2 } = p1;
        React.createElement("div", { ...p2 }, "content");
      `,
      errors: [
        { messageId: "dangerWithChildren", line: 2 },
        { messageId: "dangerWithChildren", line: 5 },
        { messageId: "dangerWithChildren", line: 6 },
        { messageId: "dangerWithChildren", line: 9 },
      ],
    },
    {
      name: "should report the jsx factory when overriden with a setting",
      code: `
        h("div", { dangerouslySetInnerHTML: { __html: "html" } }, "content");
      `,
      settings: {
        react: {
          jsxFactory: "h",
        },
      },
      errors: [{ messageId: "dangerWithChildren", line: 2 }],
    },
    {
      name: "should report the jsx factory when overriden with a pragma",
      code: `
        /* jsx h */
        /* Note: pragma takes precedence over the jsxFactory setting */
        h("div", { dangerouslySetInnerHTML: { __html: "html" } }, "content");
      `,
      settings: {
        react: {
          jsxFactory: "other",
        },
      },
      errors: [{ messageId: "dangerWithChildren", line: 4 }],
    },
  ],
});
