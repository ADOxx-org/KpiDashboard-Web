package org.adoxx.dashboard.datasource.modules.impl;

import java.io.StringReader;

import javax.json.Json;
import javax.json.JsonObject;

import org.adoxx.dashboard.datasource.modules.DSModuleI;
import org.adoxx.dashboard.datasource.utils.Utils;

public class DSJsonFile implements DSModuleI{

    @Override
    public String getUniqueName() {
        return "json-datasource";
    }

    @Override
    public JsonObject getDescription() {
        return Json.createObjectBuilder()
            .add("en", "Get data from a json file")
            .add("de", "Get data from a json file")
            .build();
    }

    @Override
    public JsonObject getConfigurationDescription() {
        return Json.createObjectBuilder()
            .add("path", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Path of the json file")
                    .add("de", "Path of the json file"))
                .add("value", "")
                .add("moreInfos", Json.createObjectBuilder()
                    .add("requireUpload", true)))
            .add("content", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Content of the json file")
                    .add("de", "Content of the json file"))
                .add("value", ""))
            .build();
    }

    @Override
    public JsonObject obtainData(JsonObject configuration) throws Exception {
        
        if(configuration.containsKey("content") && configuration.getJsonObject("content").getString("value") != null && !configuration.getJsonObject("content").getString("value").equals("")){
            JsonObject ret = Json.createReader(new StringReader(configuration.getJsonObject("content").getString("value"))).readObject();
            return ret;
        } else if(configuration.containsKey("path") && configuration.getJsonObject("path").getString("value") != null && !configuration.getJsonObject("path").getString("value").equals("")){
            String jsonPath = Utils.processLocalFilePath(configuration.getJsonObject("path").getString("value"));
            String jsonS = "";
            if(jsonPath.startsWith("http"))
                jsonS = new String(Utils.sendHTTP(jsonPath, "GET", null, null, true, true).data, "UTF-8");
            else
                jsonS = new String(Utils.readFile(jsonPath), "UTF-8");
            
            JsonObject ret = Json.createReader(new StringReader(jsonS)).readObject();
            return ret;
        } else
            throw new Exception("Configuration not valid: " + configuration.toString());
    }

    @Override
    public boolean isOutputStructured() {
        return true;
    }
}
