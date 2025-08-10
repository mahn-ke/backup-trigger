const TF_VAR_GITHUB_PAT = process.env.TF_VAR_GITHUB_PAT;
const RUN_AT_STARTUP = process.env.RUN_AT_STARTUP;
const DRY_RUN = process.env.DRY_RUN?.toLowerCase() === 'true';
const ORG = 'mahn-ke';
const WORKFLOW_FILE = 'backup.yml';
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

if (!TF_VAR_GITHUB_PAT) {
    console.error('TF_VAR_GITHUB_PAT environment variable not set.');
    process.exit(1);
}

async function getRepos() {
    const url = `https://api.github.com/orgs/${ORG}/repos?per_page=100`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${TF_VAR_GITHUB_PAT}` }
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch repos: ${res.statusText}`);
    }
    return await res.json();
}

async function triggerWorkflow(repo, branch) {
    if (DRY_RUN) {
        console.log(`DRY_RUN: Would trigger workflow ${WORKFLOW_FILE} for ${repo.name} on branch ${branch}`);
        return;
    }
    const url = `https://api.github.com/repos/${ORG}/${repo.name}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TF_VAR_GITHUB_PAT}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: branch })
    });
    if (!res.ok) {
        console.error(`Failed to trigger workflow for ${repo.name}: ${res.statusText}`);
        return;
    }

    console.log(`Triggered workflow ${WORKFLOW_FILE} for ${repo.name} on branch ${branch}`);
}

async function run() {
    try {
        const repos = await getRepos();
        for (const repo of repos) {
            await triggerWorkflow(repo, repo.default_branch);
        }
    } catch (err) {
        console.error(err);
    }
}

(async () => {
    console.log('RUN_AT_STARTUP:', RUN_AT_STARTUP);
    if (RUN_AT_STARTUP)
    {
        await run();
    }

    console.log("Next run at: ", new Date(Date.now() + INTERVAL_MS).toISOString());
    setInterval(async () => {
        await run();
        console.log("Next run at: ", new Date(Date.now() + INTERVAL_MS).toISOString());
    }, INTERVAL_MS);
})();