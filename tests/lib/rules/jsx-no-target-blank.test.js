"use strict";

const { describe, it } = require("node:test");
const rule = require("../../../lib/rules/jsx-no-target-blank.js");

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

ruleTester.run("jsx-no-target-blank", rule, {
  valid: [
    {
      name: `should ignore links without an external link, dynamic link or target="_blank"`,
      code: `
        <a></a>;
        <a href="https://example.com" />;
        <a target="_blank"></a>;
        <a target="_blank" href="relative/path/in/relative/url"></a>;
        <a target="_blank" href="/absolute/path/in/relative/url"></a>;
      `,
    },
    {
      name: `should allow links with noreferrer`,
      code: `
        <a href="https://example.com" target="_blank" rel="noreferrer noopener" />;
        <a href="https://example.com" target="_blank" rel="noreferrer" />;
        <a href="https://example.com" target="_blank" href={dynamicLink} rel="noreferrer" />;
      `,
    },
    {
      name: `should allow links without either noreferrer or noopener when allowReferrer=true`,
      code: `
        <a target="_blank" rel="noopener" />;
        <a target="_blank" rel="noreferrer noopener" />;
        <a target="_blank" rel="noreferrer" />;
        <a></a>
      `,
      options: [{ allowReferrer: true }],
    },
    {
      name: `should ignore dynamic links when enforceDynamicLinks="never"`,
      code: `
        <a target="_blank" href={dynamicLink} />;
      `,
      options: [
        {
          enforceDynamicLinks: "never",
        },
      ],
    },
    {
      name: `should allow overriding spread values when warnOnSpreadAttributes=true`,
      code: `
        <a {...foo} target="_self" />;
        <a {...foo} rel="noreferrer" />;
        <a {...foo} href="/safe/path" />;
      `,
      options: [{ warnOnSpreadAttributes: true }],
    },
    {
      name: `should ignore form components by default`,
      code: `
        <form action="https://example.com" target="_blank" />;
      `,
    },
    {
      name: `should ignore link components when links=false`,
      code: `
        <a href="https://example.com" target="_blank" />;
      `,
      options: [
        {
          links: false,
        },
      ],
    },
    {
      name: `should allow overriding default link component`,
      code: `
        <a href="https://example.com" target="_blank" />;
      `,
      settings: {
        linkComponents: [{ name: "a", linkAttribute: "test" }],
      },
    },
    {
      name: `should allow overriding default form component`,
      code: `
        <form action="https://example.com" target="_blank" />;
      `,
      settings: {
        formComponents: [{ name: "form", formAttribute: "test" }],
      },
      options: [{ forms: true }],
    },
  ],
  invalid: [
    {
      name: "should warn about links without noreferrer",
      code: `
        <a href="https://example.com" target="_blank" />;
        <a href="https://example.com" target="_blank" rel />;
        <a href="https://example.com" target="_blank" rel="foo" />;
        <a href="https://example.com" target="_blank" rel="noopener" />;
      `,
      errors: [
        { messageId: "noTargetBlankWithoutNoreferrer", line: 2 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 3 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 4 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 5 },
      ],
      output: `
        <a href="https://example.com" target="_blank" rel="noreferrer" />;
        <a href="https://example.com" target="_blank" rel="noreferrer" />;
        <a href="https://example.com" target="_blank" rel="foo noreferrer" />;
        <a href="https://example.com" target="_blank" rel="noopener noreferrer" />;
      `,
    },
    {
      name: "should ignore spacing around link attribute values",
      code: `
        <a href="  https://example.com " target="_blank" />;
      `,
      errors: [{ messageId: "noTargetBlankWithoutNoreferrer", line: 2 }],
      output: `
        <a href="  https://example.com " target="_blank" rel="noreferrer" />;
      `,
    },
    {
      name: "should warn about links without noopener (and noreferrer) when allowReferrer=true",
      code: `
        <a href="https://example.com" target="_blank" />;
        <a href="https://example.com" target="_blank" rel />;
        <a href="https://example.com" target="_blank" rel="foo" />;
      `,
      options: [{ allowReferrer: true }],
      errors: [
        { messageId: "noTargetBlankWithoutNoopener", line: 2 },
        { messageId: "noTargetBlankWithoutNoopener", line: 3 },
        { messageId: "noTargetBlankWithoutNoopener", line: 4 },
      ],
      output: `
        <a href="https://example.com" target="_blank" rel="noreferrer" />;
        <a href="https://example.com" target="_blank" rel="noreferrer" />;
        <a href="https://example.com" target="_blank" rel="foo noreferrer" />;
      `,
    },
    {
      name: `should detect cases where rel might not contain required keywords based on limited static analysis`,
      code: `
        <a href="https://example.com" target="_blank" rel={false} />;
        <a href="https://example.com" target="_blank" rel={"foo"} />;
        <a href="https://example.com" target="_blank" rel={Math.random() < 0.5 ? "foo" : "noreferrer"} />;
        <a href="https://example.com" target="_blank" rel={Math.random() < 0.5 ? "noreferrer" : "noreferrer"} />;
        <a href="https://example.com" target="_blank" rel={Math.random()} />;
      `,
      errors: [
        { messageId: "noTargetBlankWithoutNoreferrer", line: 2 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 3 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 4 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 6 },
      ],
      output: `
        <a href="https://example.com" target="_blank" rel="noreferrer" />;
        <a href="https://example.com" target="_blank" rel={"foo noreferrer"} />;
        <a href="https://example.com" target="_blank" rel={Math.random() < 0.5 ? "foo" : "noreferrer"} />;
        <a href="https://example.com" target="_blank" rel={Math.random() < 0.5 ? "noreferrer" : "noreferrer"} />;
        <a href="https://example.com" target="_blank" rel={Math.random()} />;
      `,
    },
    {
      name: `should assume the unsafe values in spreads when warnOnSpreadAttributes=true`,
      code: `
        <a {...foo} />;
        <a target="_self" {...foo} />;
        <a rel="noreferrer" {...foo} />;
        <a href="/safe/path" {...foo} />;
      `,
      options: [{ warnOnSpreadAttributes: true }],
      errors: [
        { messageId: "noTargetBlankWithoutNoreferrer", line: 2 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 3 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 4 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 5 },
      ],
      output: null,
    },
    {
      name: `should not ignore form components when forms=true`,
      code: `
        <form action="https://example.com" target="_blank" />;
      `,
      options: [{ forms: true }],
      errors: [{ messageId: "noTargetBlankWithoutNoreferrer", line: 2 }],
      output: `
        <form action="https://example.com" target="_blank" rel="noreferrer" />;
      `,
    },
    {
      name: `should allow configuring link components and their link attributes`,
      code: `
        <link href="https://example.com" target="_blank" />;
        <a test="https://example.com" target="_blank" />;
      `,
      settings: {
        linkComponents: ["link", { name: "a", linkAttribute: "test" }],
      },
      errors: [
        { messageId: "noTargetBlankWithoutNoreferrer", line: 2 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 3 },
      ],
      output: `
        <link href="https://example.com" target="_blank" rel="noreferrer" />;
        <a test="https://example.com" target="_blank" rel="noreferrer" />;
      `,
    },
    {
      name: `should allow configuring form components and their link attributes`,
      code: `
        <custom-form action="https://example.com" target="_blank" />;
        <form test="https://example.com" target="_blank" />;
      `,
      settings: {
        formComponents: [
          "custom-form",
          { name: "form", formAttribute: "test" },
        ],
      },
      options: [{ forms: true }],
      errors: [
        { messageId: "noTargetBlankWithoutNoreferrer", line: 2 },
        { messageId: "noTargetBlankWithoutNoreferrer", line: 3 },
      ],
      output: `
        <custom-form action="https://example.com" target="_blank" rel="noreferrer" />;
        <form test="https://example.com" target="_blank" rel="noreferrer" />;
      `,
    },
    {
      name: `should not report same node twice`,
      code: `
        <a href="https://example.com" target="_blank" rel={Math.random() < 0.5 ? "foo" : "foo"} />;
      `,
      errors: [{ messageId: "noTargetBlankWithoutNoreferrer", line: 2 }],
      output: null,
    },
  ],
});
