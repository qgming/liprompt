import { buildRepositoryRawUrls } from "../utils/remote-source.js";

const REMOTE_DATA_REPO = {
  owner: "qgming",
  repo: "liprompt",
  branch: "main",
};

export const REMOTE_DATA_URLS = {
  textPrompts: [
    "remote-data/text-prompts/text-1.json",
    "remote-data/text-prompts/text-2.json",
    "remote-data/text-prompts/text-3.json",
    "remote-data/text-prompts/text-4.json",
    "remote-data/text-prompts/text-5.json",
    "remote-data/text-prompts/text-6.json",
    "remote-data/text-prompts/text-7.json",
    "remote-data/text-prompts/text-8.json",
  ].map((path) => buildRepositoryRawUrls({
    ...REMOTE_DATA_REPO,
    path,
  }, "gitee")),
  imagePrompts: [
    "remote-data/image-prompts/ecommerce.json",
    "remote-data/image-prompts/ad-creative.json",
    "remote-data/image-prompts/portrait-photo.json",
    "remote-data/image-prompts/poster-illustration-1.json",
    "remote-data/image-prompts/poster-illustration-2.json",
    "remote-data/image-prompts/poster-illustration-3.json",
    "remote-data/image-prompts/character-design.json",
    "remote-data/image-prompts/ui-social-1.json",
    "remote-data/image-prompts/ui-social-2.json",
    "remote-data/image-prompts/ui-social-3.json",
    "remote-data/image-prompts/ui-social-4.json",
    "remote-data/image-prompts/comparison-community.json",
  ].map((path) => buildRepositoryRawUrls({
    ...REMOTE_DATA_REPO,
    path,
  }, "gitee")),
};

export const REMOTE_STORAGE_KEYS = {
  textPrompts: "remote_text_prompts_cache_v1",
  imagePrompts: "remote_image_prompts_cache_v1",
};

export const REMOTE_REQUEST_TIMEOUT = 1000 * 60;
