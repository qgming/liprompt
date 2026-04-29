const GITHUB_RAW_HOST = "https://raw.githubusercontent.com";
const GITEE_RAW_HOST = "https://raw.giteeusercontent.com";

function splitUrlSegments(url, prefix) {
  if (typeof url !== "string" || !url.startsWith(prefix)) {
    return null;
  }

  const pathname = url.slice(prefix.length).replace(/^\//, "");
  return pathname ? pathname.split("/") : [];
}

function parseGithubRawUrl(url) {
  const segments = splitUrlSegments(url, GITHUB_RAW_HOST);
  if (!segments || segments.length < 5) {
    return null;
  }

  const [owner, repo] = segments;
  if (segments[2] === "refs" && segments[3] === "heads") {
    const branch = segments[4];
    const path = segments.slice(5).join("/");
    if (!branch || !path) {
      return null;
    }
    return { owner, repo, branch, path };
  }

  const branch = segments[2];
  const path = segments.slice(3).join("/");
  if (!branch || !path) {
    return null;
  }
  return { owner, repo, branch, path };
}

function parseGiteeRawUrl(url) {
  const segments = splitUrlSegments(url, GITEE_RAW_HOST);
  if (!segments || segments.length < 4) {
    return null;
  }

  const [owner, repo, branch, ...rest] = segments;
  const path = rest.join("/");
  if (!owner || !repo || !branch || !path) {
    return null;
  }
  return { owner, repo, branch, path };
}

function parseSupportedRawUrl(url) {
  if (typeof url !== "string" || !url) {
    return null;
  }
  return parseGithubRawUrl(url) || parseGiteeRawUrl(url);
}

function buildGithubRawUrl(parts) {
  return `${GITHUB_RAW_HOST}/${parts.owner}/${parts.repo}/refs/heads/${parts.branch}/${parts.path}`;
}

function buildGiteeRawUrl(parts) {
  return `${GITEE_RAW_HOST}/${parts.owner}/${parts.repo}/${parts.branch}/${parts.path}`;
}

export function buildRepositoryRawUrls(parts, preferred = "github") {
  const githubUrl = buildGithubRawUrl(parts);
  const giteeUrl = buildGiteeRawUrl(parts);
  return preferred === "gitee" ? [giteeUrl, githubUrl] : [githubUrl, giteeUrl];
}

export function getRawMirrorCandidates(url, preferred = "github") {
  const parsed = parseSupportedRawUrl(url);
  if (!parsed) {
    return [url];
  }

  return buildRepositoryRawUrls(parsed, preferred);
}

export function getPreferredRawMirrorUrl(url, preferred = "github") {
  return getRawMirrorCandidates(url, preferred)[0];
}

export function getRawSourceCacheKey(url) {
  const parsed = parseSupportedRawUrl(url);
  if (!parsed) {
    return url;
  }
  return `${parsed.owner}/${parsed.repo}/${parsed.branch}/${parsed.path}`;
}
