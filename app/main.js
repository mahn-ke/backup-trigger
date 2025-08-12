const TF_VAR_GITHUB_PAT = process.env.TF_VAR_GITHUB_PAT;
const RUN_AT_STARTUP = process.env.RUN_AT_STARTUP?.toLowerCase() === 'true';
const DRY_RUN = process.env.DRY_RUN?.toLowerCase() === 'true';
const ORG = 'mahn-ke';
const WORKFLOW_FILE = 'backup.yml';

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

function calculateMillisecondsUntilNextMidnight() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 30, 0); // offset by 30 seconds to guarantee next day
    return nextMidnight - now;
}

async function runAndSchedule() {
    try {
        await run();
    } catch (err) {
        console.error('Error during midnight run:', err);
        process.exit(1);
    }
    scheduleNextRun();
}

function scheduleNextRun() {
    const nextRunTime = Date.now() + calculateMillisecondsUntilNextMidnight();
    console.log("Next run at: ", new Date(nextRunTime).toISOString());
    setTimeout(runAndSchedule, calculateMillisecondsUntilNextMidnight());
}

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

(async () => {
    console.log('RUN_AT_STARTUP:', RUN_AT_STARTUP);
    if (RUN_AT_STARTUP) {
        try {
            await run();
        } catch (err) {
            console.error('Error during startup run:', err);
        }
    }

    scheduleNextRun();
})();
