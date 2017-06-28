package org.adoxx.dashboard.datasource.rest;

import java.io.StringReader;

import javax.json.Json;
import javax.json.JsonObject;
import javax.servlet.ServletContext;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

import org.adoxx.dashboard.datasource.DSWrapper;

@Path("datasourceWrapper")
public class RESTService {

    @Context
    ServletContext context;
    
    @GET
    @Path("/getModules")
    @Produces(MediaType.APPLICATION_JSON)
    public String getModules(){
        try{
            JsonObject ret = DSWrapper.getModules();
            return ret.toString();
        }catch(Exception ex){
            ex.printStackTrace();
            return "{\"error\":\""+ex.getMessage().replace("\\", "\\\\").replace("\"", "\\\"")+"\"}";
        }        
    }
    
    @POST
    @Path("/executeModule")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public String executeModule(@QueryParam("moduleName") String moduleName, String moduleConfiguration){
        try{
            JsonObject config = Json.createReader(new StringReader(moduleConfiguration)).readObject();
            JsonObject ret = DSWrapper.callModule(moduleName, config);
            return ret.toString();
            //throw new Exception("error");
        }catch(Exception ex){
            ex.printStackTrace();
            return "{\"error\":\""+ex.getMessage().replace("\\", "\\\\").replace("\"", "\\\"")+"\"}";
        }        
    }
    
    @POST
    @Path("/uploadLocalDatasource")
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    @Produces(MediaType.TEXT_PLAIN)
    public String uploadLocalDatasource(@QueryParam("fileName") String fileName, byte[] fileContent){
        try{
            String ret = DSWrapper.uploadLocalDatasource(fileName, fileContent);
            return ret;
        }catch(Exception ex){
            ex.printStackTrace();
            return "";
        }        
    }
    
    /*
    @POST
    @Path("/evaluateKPI")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public JsonObject evaluateKPI(@QueryParam("modelId") String modelId, @QueryParam("kpiId") String kpiId, String model) throws Exception {
        JsonObject modelJson = Json.createReader(new StringReader(model)).readObject();
        ScriptEngine scriptEngine = new ScriptEngineManager().getEngineByName("JavaScript");
        scriptEngine.put("kpiModel", modelJson);
        String jQueryScript = new String(Utils.toByteArray(context.getResourceAsStream("/js/libs/jquery-3.2.1.min.js")), "UTF-8");
        String dashboardScript = new String(Utils.toByteArray(context.getResourceAsStream("/js/dashboard.core.js")), "UTF-8");
        String function = "function toRun() { ModelManager.kpiModel = kpiModel; return Dashboard.evaluateKpi('"+modelId+"', '"+kpiId+"'); }";
        scriptEngine.eval(jQueryScript);
        scriptEngine.eval(dashboardScript);
        scriptEngine.eval(function);
        Object ret = ((Invocable) scriptEngine).invokeFunction("toRun");
        return (JsonObject) ret;
    }
    */
}
