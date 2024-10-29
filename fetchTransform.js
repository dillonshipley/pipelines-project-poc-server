import apiCall from "./apiCall.js";

export async function getEnvironmentData(name){
    let environmentData = await apiCall(`https://gitlab.chq.ei/api/v4/projects/${name}/environments`);
    if(environmentData === "ERROR"){
        return {error: "ERROR"};
    }
    if(environmentData.length === 0){
        return {message: "NOENVS"};
    }
    const filteredEnvironmentData = environmentData.map(item => ({
        name: item.name,
        url: item.external_url
    }));
    return filteredEnvironmentData;
}

export async function getJenkinsData(project){
    let rawJenkinsData = await apiCall(`https://ci-rainier.chq.ei/view/CRM/view/${project}/api/json`);
    if(rawJenkinsData != null && typeof rawJenkinsData === 'object' && !('error' in rawJenkinsData) && 'jobs' in rawJenkinsData){
        let jenkinsJobs = rawJenkinsData.jobs;
        jenkinsJobs = jenkinsJobs.filter(item => !item.name.toLowerCase().includes("check"));
        for(let job of jenkinsJobs){
            let rawJenkinsBuildData = await apiCall(`https://ci-rainier.chq.ei/view/CRM/view/${project}/job/${job.name}/api/json?tree=builds[timestamp,actions[causes[userId,fullName]],result,duration]`);
            
            job.name = job.name.replace("Group", "");              // Remove "Group"
            job.name = job.name.replace(/[0-9]/g, "");             // Remove all digits
            job.name = job.name.replace(/_/g, "");
            job.name = job.name.replace(project, "");

            for(let build of rawJenkinsBuildData.builds){
                let userID = "";
                let actions = build.actions;
                for(let action of actions){
                    if (action._class === 'hudson.model.CauseAction') {
                        const causes = action.causes;
                        userID = causes[0].userId
                        break; // Exit loop once we found the CauseAction
                    }
                }
                build.userID = userID;
            }
            
            job.deployments = rawJenkinsBuildData.builds.map(item => ({
                status: item.result,
                createdDate: new Date(item.timestamp),
                deployUser: item.userID
            }));
        }
        return jenkinsJobs;
    } else {
        return rawJenkinsData;
    }
}

export async function getDeploymentData(name, envs){
    let newEnvs = envs;
    let deploymentData = await apiCall(`https://gitlab.chq.ei/api/v4/projects/${name}/deployments?per_page=100&order_by=created_at&sort=desc`);
    for(let environment of newEnvs){
        let envDeploymentData = deploymentData.filter(item => item.environment.name.toLowerCase() === environment.name.toLowerCase());
        if(envDeploymentData.length == 0 || envDeploymentData == null){
            environment.deployments = [];
        } 
        let envDeployments = [];
        for(let deployment of envDeploymentData){
            console.log(deployment);
            if('user' in deployment && deployment.user != null){
                const filteredDeploymentData = {
                    deployUser: deployment.user.name,
                    createdDate: deployment.created_at,
                    env: deployment.environment.name,
                    status: deployment.status,
                    commit: deployment.sha,
                    jobId: deployment.iid,
                    realJobId: deployment.deployable.id,
                    jobName: deployment.deployable.name.replace(/_(one|two|three|four|five|six|seven|eight|nine|ten)$/i, '')
                };
                envDeployments.push(filteredDeploymentData);
            }
        }
        envDeployments = envDeployments.filter(item => (item.jobName.includes('deploy')));

        //Filter out duplicates based on commit, keeping the later createdDate
        const uniqueDeployments = envDeployments.reduce((acc, current) => {
            const existing = acc.find(item => item.commit === current.commit);
            if (!existing) {
                acc.push(current);
            } else if (current.createdDate > existing.createdDate) {
                // Replace with the later one
                const index = acc.indexOf(existing);
                acc[index] = current;
            }
            return acc;
        }, []);

        environment.deployments = uniqueDeployments; 
    }

    return newEnvs;
}

export async function redeployVersion(projectID, jobID){
    let jobData = await apiCall(`https://gitlab.chq.ei/api/v4/projects/${projectID}/jobs/${jobID}/retry`, "post");
    if(jobData === "ERROR"){
        return {error: "ERROR"};
    } else {
        return {message: "I have no idea what will happen"};
    }
}