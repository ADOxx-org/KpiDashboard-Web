package org.adoxx.dashboard.datasource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map.Entry;

import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonString;
import javax.json.JsonValue;

import org.adoxx.dashboard.datasource.modules.DSModuleI;
import org.adoxx.dashboard.datasource.modules.impl.DSExcel;
import org.adoxx.dashboard.datasource.modules.impl.DSJsonFile;
import org.adoxx.dashboard.datasource.modules.impl.DSMSSQLServer;
import org.adoxx.dashboard.datasource.modules.impl.DSMySQL;
import org.adoxx.dashboard.datasource.modules.impl.DSRESTService;
import org.adoxx.dashboard.datasource.modules.impl.DSTripleStore;
import org.adoxx.dashboard.datasource.utils.Utils;

public class DSWrapper {
    public static List<DSModuleI> moduleList = new ArrayList<DSModuleI>();
    
    static{
        moduleList.add(new DSJsonFile());
        moduleList.add(new DSExcel());
        moduleList.add(new DSMSSQLServer());
        moduleList.add(new DSMySQL());
        moduleList.add(new DSRESTService());
        moduleList.add(new DSTripleStore());
    }
    
    public static JsonObject getModules(){
        JsonArrayBuilder arrayBuilder = Json.createArrayBuilder();
        for(DSModuleI module : moduleList)
            if(module.getUniqueName() != null && !module.getUniqueName().isEmpty() && module.getDescription() != null && module.getConfigurationDescription() != null)
                arrayBuilder.add(Json.createObjectBuilder()
                                                            .add("name", module.getUniqueName())
                                                            .add("description", module.getDescription())
                                                            .add("configuration", module.getConfigurationDescription())
                                                            .add("structuredOutput", module.isOutputStructured())
                                );
        JsonObject ret = Json.createObjectBuilder().add("moduleList", arrayBuilder).build();
        return ret;
    }
    
    public static JsonObject callModule(String moduleName, JsonObject moduleConfiguration) throws Exception{
        DSModuleI moduleToUse = null;
        
        for(DSModuleI module : moduleList)
            if(module.getUniqueName().equals(moduleName))
                moduleToUse = module;
        if(moduleToUse == null)
            throw new Exception("Impossible to find the module " + moduleName);
        
        JsonObject moduleCofigDesc = moduleToUse.getConfigurationDescription();
        
        for(Entry<String, JsonValue> entry : moduleConfiguration.entrySet())
            if(moduleCofigDesc.getJsonObject(entry.getKey()) == null || moduleConfiguration.getJsonObject(entry.getKey()).getJsonString("value") == null)
                throw new Exception("Error in the configuration provided for the module " + moduleName + " : " + entry.getKey());
        
        JsonObject moduleOut = moduleToUse.obtainData(moduleConfiguration);
        
        if(moduleToUse.isOutputStructured()){
           if(moduleOut.getJsonArray("columns") == null)
               throw new Exception("The returned json of the module " + moduleName + " must contain a 'columns' json array");
           if(moduleOut.getJsonArray("data") == null)
               throw new Exception("The returned json of the module " + moduleName + " must contain a 'data' json array");
           
           ArrayList<String> columnList = new ArrayList<String>();
           for(JsonValue column : moduleOut.getJsonArray("columns"))
               columnList.add(((JsonString)column).getString());
           
           for(JsonValue data : moduleOut.getJsonArray("data")){
               if(!(data instanceof JsonObject))
                   throw new Exception("Expected Json Object; returned : " + data.getValueType().toString() + " -> " + data.toString());
               JsonObject dataO = (JsonObject) data;
               for(String column : columnList)
                   if(dataO.getJsonString(column) == null)
                       throw new Exception("Json String " + column + " not present in the object " + dataO.toString());
           }
        }else{
            if(moduleOut.getJsonString("dataFormat") == null)
                throw new Exception("The returned json of the module " + moduleName + " must contain a 'dataFormat' json string");
            if(moduleOut.getJsonString("data") == null)
                throw new Exception("The returned json of the module " + moduleName + " must contain a 'data' json string");
        }
        
        return moduleOut;
    }
    
    public static String uploadLocalDatasource(String fileName, byte[] fileContent) throws Exception{
        if(fileName.contains("\\"))
            fileName = fileName.substring(fileName.lastIndexOf("\\"));
        if(fileName.contains("/"))
            fileName = fileName.substring(fileName.lastIndexOf("/"));
        
        String ret = "_" + java.util.UUID.randomUUID() + "\\" + fileName;
        
        String filePath = System.getProperty("java.io.tmpdir")+(System.getProperty("java.io.tmpdir").endsWith("\\")?"":"\\")+"ADOxxDashboard_uploadedDS\\" + ret;
        Utils.writeFile(fileContent, filePath, false);
        return ret;
    }
}
