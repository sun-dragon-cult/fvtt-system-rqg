import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

test("Dropping a compendium on an actor sheet embeds all its items", async ({ page, baseURL }) => {
  test.slow();

  await loginToConfiguredWorld(page, baseURL);

  // Create a fresh test actor and get its id
  let actorId: string | null = null;
  let createdActor = false;

  await expect
    .poll(
      async () => {
        actorId = await page.evaluate(async () => {
          const gameRef = globalThis as {
            game?: {
              actors?: {
                create?: (data: Record<string, unknown>) => Promise<{ id: string } | undefined>;
                documentClass?: {
                  create?: (data: Record<string, unknown>) => Promise<{ id: string } | undefined>;
                };
              };
            };
            CONFIG?: {
              Actor?: {
                documentClass?: {
                  create?: (data: Record<string, unknown>) => Promise<{ id: string } | undefined>;
                };
              };
            };
            Actor?: {
              create?: (data: Record<string, unknown>) => Promise<{ id: string } | undefined>;
            };
          };

          const actorSource = {
            name: "e2e-test-compendium-drop",
            type: "character",
          };

          try {
            const actor = await gameRef.game?.actors?.create?.(actorSource);
            if (actor?.id) {
              return actor.id;
            }
          } catch {
            // Continue to v14/v13 fallback entry points.
          }

          try {
            const actor = await gameRef.game?.actors?.documentClass?.create?.(actorSource);
            if (actor?.id) {
              return actor.id;
            }
          } catch {
            // Continue to v14/v13 fallback entry points.
          }

          try {
            const actor = await gameRef.CONFIG?.Actor?.documentClass?.create?.(actorSource);
            if (actor?.id) {
              return actor.id;
            }
          } catch {
            // Continue to v14/v13 fallback entry points.
          }

          try {
            const actor = await gameRef.Actor?.create?.(actorSource);
            if (actor?.id) {
              return actor.id;
            }
          } catch {
            // No supported creation path succeeded.
          }

          return null;
        });
        createdActor = await page.evaluate(
          (id) =>
            (
              globalThis as { game?: { actors?: { get?: (id: string) => { name?: string } } } }
            ).game?.actors?.get?.(id ?? "")?.name === "e2e-test-compendium-drop",
          actorId,
        );
        return actorId;
      },
      {
        message: "Expected to create a new actor for compendium drop",
        timeout: 15000,
      },
    )
    .toBeTruthy();

  try {
    // Find the "Hitlocation / Humanoids" compendium pack by label
    const packId = await page.evaluate(() => {
      const gameRef = globalThis as {
        game?: {
          packs?: {
            find?: (
              fn: (p: { metadata?: { label?: string }; collection: string }) => boolean,
            ) => { collection: string } | undefined;
          };
        };
      };
      const pack = gameRef.game?.packs?.find?.((p) => /humanoid/i.test(p.metadata?.label ?? ""));
      return pack?.collection ?? null;
    });

    expect(packId, 'Expected to find a compendium pack with "Humanoid" in its label').toBeTruthy();

    // Render the actor sheet
    await expect
      .poll(
        async () =>
          page.evaluate((id) => {
            const gameRef = globalThis as {
              game?: {
                actors?: {
                  get?: (
                    id: string,
                  ) => { sheet?: { render?: (force: boolean) => void } } | undefined;
                };
              };
            };
            const actor = gameRef.game?.actors?.get?.(id);
            if (!actor?.sheet?.render) {
              return false;
            }
            actor.sheet.render(true);
            return true;
          }, actorId!),
        {
          message: "Expected actor sheet to render",
          timeout: 15000,
        },
      )
      .toBe(true);

    // Wait for the sheet window to appear, then simulate a Compendium drop
    await expect
      .poll(
        async () =>
          page.evaluate(
            async ({ id, collection }) => {
              const gameRef = globalThis as {
                game?: {
                  actors?: {
                    get?:
                      | ((id: string) => {
                          sheet?: { _onDrop?: (event: unknown) => Promise<void> };
                        })
                      | undefined;
                  };
                };
              };

              const actor = gameRef.game?.actors?.get?.(id);
              const sheetApp = actor?.sheet;
              if (!sheetApp?._onDrop) {
                return false;
              }

              const dropData = JSON.stringify({ type: "Compendium", collection });
              const mockEvent = {
                preventDefault: () => undefined,
                stopPropagation: () => undefined,
                dataTransfer: {
                  getData: () => dropData,
                },
              };

              await sheetApp._onDrop(mockEvent);
              return true;
            },
            { id: actorId!, collection: packId! },
          ),
        {
          message: "Expected actor sheet to receive the compendium drop",
          timeout: 15000,
        },
      )
      .toBe(true);

    // Wait for hitLocation items to appear on the actor
    await expect
      .poll(
        async () =>
          page.evaluate((id) => {
            const gameRef = globalThis as {
              game?: {
                actors?: {
                  get?: (id: string) =>
                    | {
                        items?: {
                          filter?: (fn: (i: { type?: string }) => boolean) => unknown[];
                        };
                      }
                    | undefined;
                };
              };
            };
            const actor = gameRef.game?.actors?.get?.(id);
            return actor?.items?.filter?.((i) => i.type === "hitLocation").length ?? 0;
          }, actorId!),
        {
          message: "Expected actor to have hitLocation items after compendium drop",
          timeout: 20000,
        },
      )
      .toBeGreaterThan(0);
  } finally {
    // Clean up the test actor regardless of test outcome
    await page.evaluate(
      async ({ id, shouldDelete }) => {
        if (!shouldDelete) {
          return;
        }
        const gameRef = globalThis as {
          game?: {
            actors?: {
              get?: (id: string) => { delete?: () => Promise<void> } | undefined;
            };
          };
        };
        await gameRef.game?.actors?.get?.(id)?.delete?.();
      },
      { id: actorId!, shouldDelete: createdActor },
    );
  }
});
