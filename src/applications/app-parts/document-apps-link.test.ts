import { describe, expect, it, vi } from "vitest";
import { RelatedDocumentsAppsLink } from "./document-apps-link";

const makeApp = (rendered = true) => ({ id: "sheet", rendered, render: vi.fn(), close: vi.fn() });
const makeDocument = () => ({ apps: {} as Record<string, unknown> });

describe("RelatedDocumentsAppsLink", () => {
  it("puts a stand-in, not the app, in each linked document's apps", () => {
    const app = makeApp();
    const link = new RelatedDocumentsAppsLink(app);
    const ally = makeDocument();
    const spirit = makeDocument();

    link.link([ally, undefined, spirit, null]);

    expect(ally.apps["sheet"]).toBe(link.standIn);
    expect(spirit.apps["sheet"]).toBe(link.standIn);
    expect(link.standIn).not.toBe(app);
  });

  it("forwards document renders to the app", () => {
    const app = makeApp();
    const link = new RelatedDocumentsAppsLink(app);

    link.standIn.render(false, { renderContext: "updateActor" });

    expect(app.render).toHaveBeenCalledWith(false, { renderContext: "updateActor" });
  });

  it("rerenders instead of closing the app when a linked document closes its apps", async () => {
    const app = makeApp();
    const link = new RelatedDocumentsAppsLink(app);

    await link.standIn.close({ submit: false });

    expect(app.close).not.toHaveBeenCalled();
    expect(app.render).toHaveBeenCalledOnce();
  });

  it("does nothing on close when the app isn't rendered", async () => {
    const app = makeApp(false);
    const link = new RelatedDocumentsAppsLink(app);

    await link.standIn.close();

    expect(app.close).not.toHaveBeenCalled();
    expect(app.render).not.toHaveBeenCalled();
  });

  it("relinks to the new set, unlinking documents no longer in it", () => {
    const link = new RelatedDocumentsAppsLink(makeApp());
    const ally = makeDocument();
    const spirit = makeDocument();
    const newSpirit = makeDocument();

    link.link([ally, spirit]);
    link.link([ally, newSpirit]);

    expect(ally.apps["sheet"]).toBe(link.standIn);
    expect(spirit.apps).toEqual({});
    expect(newSpirit.apps["sheet"]).toBe(link.standIn);
  });

  it("never displaces another app with the same id", () => {
    const app = makeApp();
    const link = new RelatedDocumentsAppsLink(app);
    const own = { apps: { sheet: app } as Record<string, unknown> };

    link.link([own]);
    link.unlink();

    expect(own.apps["sheet"]).toBe(app);
  });

  it("unlinks from every document, leaving other apps alone", () => {
    const link = new RelatedDocumentsAppsLink(makeApp());
    const ally = makeDocument();
    const other = { render: vi.fn() };
    ally.apps["other"] = other;

    link.link([ally]);
    link.unlink();

    expect(ally.apps).toEqual({ other });
  });
});
