import express, { json } from 'express';
import apiCall from './apiCall.js';
import { pipeline } from 'stream';
import cors from 'cors';
import { getDeploymentData, getEnvironmentData, getJenkinsData, redeployVersion } from './fetchTransform.js';

const app = express();
const PORT = 3000;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(cors());

app.get('/mdm-projects', async (req, res) => {
    let data = await apiCall('https://gitlab.chq.ei/api/v4/groups/CRM/projects?per_page=200');
    console.log(data[1]);
    const jsonObject = data.map(item => ({
        name_with_namespace: item.name_with_namespace.replace("-deployment", ""),
        path_with_namespace: item.path_with_namespace,
        name: item.name,
        url: item.web_url
    }));

    const filteredObject = jsonObject.filter(item => 
        !jsonObject.some(otherItem => 
            otherItem.name === `${item.name}-deployment`
        )
    );

    res.send({projects: filteredObject});
});

app.get('/project/:name', async (req, res) => {
    let name = req.params.name;
    console.log("\nRetrieving information about " + name + "...");
    let newPath = name.replaceAll('/', '%2F');
    let data = await apiCall(`https://gitlab.chq.ei/api/v4/projects/${newPath}`);
    //let pipelineData = await apiCall(`https://gitlab.chq.ei/api/v4/projects/CRM%2F${name}/pipelines`);
    
    let envData = await getEnvironmentData(newPath);
    if('message' in envData){
        let jenkinsData = await getJenkinsData(name, 0);
        if(jenkinsData == "ERROR"){
            res.send({environments: envData.message, source: "none"});
            return;
        }
        else{
            res.send({environments: jenkinsData, source: "Jenkins"});
            return;
        }
    } else if(envData.length == 0 || 'error' in envData){
        let jenkinsData = await getJenkinsData(name, 0)
        res.send({environments: jenkinsData, source: "Jenkins"});
    } else {
        let envWithDeploymentData = await getDeploymentData(newPath, envData);
        res.send({environments: envWithDeploymentData, source: "GitLab"})
    }
});

app.get('/redeployProject/:name/:jobId', async (req, res) => {
    let name = req.params.name;
    let jobId = req.params.jobId;
    console.log("works" + jobId + name);
    let newPath = name.replaceAll('/', '%2F');
    let data = await redeployVersion(newPath, jobId);
    return;
});

// Start listening on the specified port
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});