package org.adoxx.dashboard.datasource.modules;

import javax.json.JsonObject;

public interface DSModuleI {
    
    /**
     * @return the unique name of the component 
     */
    public String getUniqueName();
    
    /**
     * @return a json object containing a small description of the module in different languages. The format should be:
     * {
     *  en : "Description",
     *  de : "Beschreibung",
     *  es : "Descripción",
     *  pl : "Opis"
     * }
     * 
     */
    public JsonObject getDescription();
    
    /**
     * @return the configuration json required by the module in order to work correctly.
     * This json object must contain a json object for each parameter needed to be configured and 
     * each parameter must contain a json object for its description in different languages and 
     * a json string for passing the value of the parameter (that in this method will be empty).
     * 
     * Example:
     * {
     *  endpoint : {
     *      description : {
     *          en : "description",
     *          de : "Beschreibung",
     *          es : "Descripción",
     *          pl : "Opis"
     *      },
     *      value : ''
     *  },
     *  query : {
     *      description : {
     *          en : "description",
     *          de : "Beschreibung",
     *          es : "Descripción",
     *          pl : "Opis"
     *      },
     *      value : ''
     *  }
     * }
     *
     */
    public JsonObject getConfigurationDescription();
    
    /**
     * This method call the managed service using the provided configuration and return the service output in a structured way
     * @param the configuration json as returned by the getConfigurationDescription method, but with the value field set
     * @return a json object representing a table of data when possible, else a general output. 
     * In case of the table representation it must containing an array that describe the data columns and 
     * an array with a json object for each row.
     * 
     * Example:
     * {
     *  columns : ['value', 'instantTime', 'field3']
     *  data : [
     *      {
     *          value : '...',
     *          instantTime : '...',
     *          field3 : '...'
     *      },{
     *          value : '...',
     *          instantTime : '...',
     *          field3 : '...'
     *      },{
     *          value : '...',
     *          instantTime : '...',
     *          field3 : '...'
     *      }
     *  ]
     * }
     * 
     * In case of general output and with data that can not returned as a table it must return a json object containing 
     * the type of the data (from the java MediaType) and the raw data.
     * Example:
     * {
     *  dataFormat : 'application/xml',
     *  data : '...'
     * }
     */
    public JsonObject obtainData(JsonObject configuration) throws Exception;
    
    /**
     * @return true if the obtainData method return a json representing a table, false when return a general output json
     */
    public boolean isOutputStructured();
}
