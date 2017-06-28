package org.adoxx.dashboard.datasource.modules.impl;

import java.io.StringReader;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Map.Entry;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonValue;

import org.adoxx.dashboard.datasource.modules.DSModuleI;
import org.adoxx.dashboard.datasource.utils.Utils;

public class DSTripleStore implements DSModuleI{

    @Override
    public String getUniqueName() {
        return "triplestore-datasource";
    }

    @Override
    public JsonObject getDescription() {
        return Json.createObjectBuilder()
            .add("en", "Get data from a triple store")
            .add("de", "Get data from a triple store")
            .build();
    }

    @Override
    public JsonObject getConfigurationDescription() {
        return Json.createObjectBuilder()
            .add("endpoint", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Url of the triple store")
                    .add("de", "Url of the triple store"))
                .add("value", ""))
            .add("sparqlQuery", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "SPARQL Query")
                    .add("de", "SPARQL Query"))
                .add("value", ""))
            .build();
    }

    @Override
    public JsonObject obtainData(JsonObject configuration) throws Exception {
        String endpoint = configuration.getJsonObject("endpoint").getString("value");
        String sparqlQuery = configuration.getJsonObject("sparqlQuery").getString("value");
        
        ArrayList<String[]> htmlHeaderList = new ArrayList<String[]>();
        htmlHeaderList.add(new String[]{"Content-Type", "application/x-www-form-urlencoded"});
        String resultJsonS = new String(Utils.sendHTTP(endpoint, "POST", "query="+URLEncoder.encode(sparqlQuery, "UTF-8"), htmlHeaderList, true, true).data, "UTF-8");
        JsonObject resultJson = Json.createReader(new StringReader(resultJsonS)).readObject();
        JsonArray resultList = resultJson.getJsonObject("results").getJsonArray("bindings");
        JsonArray varsList = resultJson.getJsonObject("head").getJsonArray("vars");
        
        JsonArrayBuilder dataList = Json.createArrayBuilder();
        
        for(JsonValue result : resultList){
            JsonObjectBuilder objBuilder = Json.createObjectBuilder();
            for(Entry<String, JsonValue> entry : ((JsonObject)result).entrySet())
                objBuilder.add(entry.getKey(), ((JsonObject)entry.getValue()).getString("value"));
            dataList.add(objBuilder);
        }
        
        return Json.createObjectBuilder()
            .add("columns", varsList)
            .add("data", dataList)
            .build();
    }

    @Override
    public boolean isOutputStructured() {
        return true;
    }
}
