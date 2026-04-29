import { loadPrompts } from "./prompts-manager.js";
import { loadImagePrompts } from "./image-prompts-manager.js";

let bootstrapPromise = null;

export function bootstrapRemoteData(forceRefresh = false) {
  if (bootstrapPromise && !forceRefresh) {
    return bootstrapPromise;
  }

  bootstrapPromise = Promise.all([
    loadPrompts(forceRefresh),
    loadImagePrompts(forceRefresh),
  ]).then(([textPrompts, imagePrompts]) => ({
    textPrompts,
    imagePrompts,
  })).catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}
