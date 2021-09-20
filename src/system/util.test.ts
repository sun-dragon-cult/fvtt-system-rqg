import { convertDeleteKeyToFoundrySyntax, deleteKeyPrefix } from "./util";

describe("Convert workaround delete prefix to foundry prefix", () => {
  it("test conversion", () => {
    // Arrange
    const updateData = {
      name: "foo",
      data: {
        keepit: 1,
        [`${deleteKeyPrefix}toConvert`]: `${deleteKeyPrefix}`,
        [`dont${deleteKeyPrefix}convert`]: `${deleteKeyPrefix}`,
        array: [{ [`${deleteKeyPrefix}alsoConvert`]: "abc" }, { keep: ["def", "xyz"] }],
      },
    };

    // Act
    const after = convertDeleteKeyToFoundrySyntax(updateData);

    // Assert
    expect(after).toStrictEqual(expected);
  });

  const expected = {
    name: "foo",
    data: {
      keepit: 1,
      "-=toConvert": `${deleteKeyPrefix}`, // Convert when key is starting with --= but don't convert value
      [`dont${deleteKeyPrefix}convert`]: `${deleteKeyPrefix}`, // Don't convert if --= is not at the start
      array: [{ "-=alsoConvert": "abc" }, { keep: ["def", "xyz"] }], // Convert inside arrays
    },
  };
});
