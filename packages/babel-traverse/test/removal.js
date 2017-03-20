import traverse from "../lib";
import assert from "assert";
import { parse } from "babylon";
import generate from "babel-generator";

function getPath(code) {
  const ast = parse(code);
  let path;
  traverse(ast, {
    Program: function (_path) {
      path = _path;
      _path.stop();
    },
  });

  return path;
}

function generateCode(path) {
  return generate(path.node).code;
}

describe("removal", function () {
  describe("ArrowFunction", function () {
    it("remove body", function () {
      const rootPath = getPath("x = () => b;");
      const path = rootPath.get("body")[0].get("expression").get("right");
      const body = path.get("body");
      body.remove();

      assert.equal(generateCode(rootPath), "x = () => {};", "body should be replaced with BlockStatement");
    });
  });

  describe("comment sharing", function () {
    function transpile(code) {
      const ast = parse(code);
      traverse(ast, {
        Identifier: function (path) {
          const node = path.node;
          if (node.name === "removeme") {
            path.remove();
          }
        },
      });

      return generate(ast.program).code;
    }

    it("preserve comment when only previous node", function() {
      const actual = `0;
// before
removeme; // same line
// after`;
      const expected = `0; // before
// after`;
      assert.equal(transpile(actual), expected, "comment must be shared with previous node");
    });

    it("preserve comment when only next node", function() {
      const actual = `// before
removeme;
// after
0;`;
      const expected = `// before
// after
0;`;
      assert.equal(transpile(actual), expected, "comment must be shared with next node");
    });

    it("preserve comment when surrounded", function() {
      const actual = `0;
// before
removeme;
// after
0;`;
      const expected = `0; // before

// after
0;`;
      console.log("actual", transpile(actual));
      assert.equal(transpile(actual), expected, "comment must be shared with surrounding nodes");
    });
  });
});
