package org.adoxx.dashboard.datasource.modules.impl;

import java.util.ArrayList;

import javax.json.Json;
import javax.json.JsonObject;
import javax.ws.rs.core.MediaType;

import org.adoxx.dashboard.datasource.modules.DSModuleI;
import org.adoxx.dashboard.datasource.utils.Utils;
import org.adoxx.dashboard.datasource.utils.Utils.HttpResults;

public class DSRESTService implements DSModuleI{

    @Override
    public String getUniqueName() {
        return "rest-datasource";
    }

    @Override
    public JsonObject getDescription() {
        return Json.createObjectBuilder()
            .add("en", "Get data from a REST service")
            .add("de", "Get data from a REST service")
            .build();
    }

    @Override
    public JsonObject getConfigurationDescription() {
        return Json.createObjectBuilder()
            .add("endpoint", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Url of the REST service")
                    .add("de", "Url of the REST service"))
                .add("value", ""))
            .add("method", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Http connection method: POST/GET")
                    .add("de", "Http connection method: POST/GET"))
                .add("value", ""))
            .add("requestContentType", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Http request content type")
                    .add("de", "Http request content type"))
                .add("value", ""))
            .add("querystring", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Query string")
                    .add("de", "Query string"))
                .add("value", ""))
            .add("postData", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Data to post (only when method=POST)")
                    .add("de", "Data to post (only when method=POST)"))
                .add("value", ""))
            .add("additionalHeaders", Json.createObjectBuilder()
                    .add("description", Json.createObjectBuilder()
                        .add("en", "Additional headers to append to the request, separated by \\n (\"Accept: application/json\\nAuthorization: Basic YTphQGE=\")")
                        .add("de", "Additional headers to append to the request, separated by \\n (\"Accept: application/json\\nAuthorization: Basic YTphQGE=\")"))
                    .add("value", ""))
            .build();
    }

    @Override
    public JsonObject obtainData(JsonObject configuration) throws Exception {
        String endpoint = configuration.getJsonObject("endpoint").getString("value");
        String method = configuration.getJsonObject("method").getString("value");
        String requestContentType = (configuration.getJsonObject("requestContentType")!=null)?configuration.getJsonObject("requestContentType").getString("value"):null;
        String querystring = (configuration.getJsonObject("querystring")!=null)?configuration.getJsonObject("querystring").getString("value"):null;
        String postData = (configuration.getJsonObject("postData")!=null)?configuration.getJsonObject("postData").getString("value"):null;
        String additionalHeaders = (configuration.getJsonObject("additionalHeaders")!=null)?configuration.getJsonObject("additionalHeaders").getString("value"):null;
        
        if(method == null || (!method.equals("POST") && !method.equals("GET")) )
            throw new Exception("Invalid method provided: " + method);
        
        endpoint = (querystring!=null)?endpoint+"?"+querystring:endpoint;
        
        ArrayList<String[]> htmlHeaderList = new ArrayList<String[]>();
        if(requestContentType != null)
            htmlHeaderList.add(new String[]{"Content-Type", requestContentType});
        
        if(additionalHeaders!=null)
            for(String additionalHeader : additionalHeaders.split("\n"))
                htmlHeaderList.add(new String[]{additionalHeader.split(":")[0].trim(), additionalHeader.split(":")[1].trim()});
        
        HttpResults out = Utils.sendHTTP(endpoint, method, postData, htmlHeaderList, true, true);
        
        String returnedContentType = out.headerMap.get("Content-Type").get(0);
        String returnedDataS = "";
        if(returnedContentType.equals(MediaType.APPLICATION_OCTET_STREAM))
            returnedDataS = Utils.base64Encode(out.data);
        else
            returnedDataS = new String(out.data, "UTF-8");
        
        return Json.createObjectBuilder()
            .add("dataFormat", returnedContentType)
            .add("data", returnedDataS)
            .build();
    }

    @Override
    public boolean isOutputStructured() {
        return false;
    }

}
