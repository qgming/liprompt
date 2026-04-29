const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/qgming/liprompt/refs/heads/main/remote-data";

export const REMOTE_DATA_URLS = {
  textPrompts: `${GITHUB_RAW_BASE}/text-prompts.json`,
  imagePrompts: `${GITHUB_RAW_BASE}/image-prompts.json`,
};

export const REMOTE_STORAGE_KEYS = {
  textPrompts: "remote_text_prompts_cache_v1",
  imagePrompts: "remote_image_prompts_cache_v1",
};

export const REMOTE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
