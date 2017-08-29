package org.adoxx.dashboard.datasource.modules.impl;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;

import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;

import org.adoxx.dashboard.datasource.modules.DSModuleI;
import org.adoxx.dashboard.datasource.utils.Utils;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

public class DSExcel implements DSModuleI{

    @Override
    public String getUniqueName() {
        return "excel-datasource";
    }

    @Override
    public JsonObject getDescription() {
        return Json.createObjectBuilder()
            .add("en", "Get data from an Excel sheet")
            .add("de", "Get data from an Excel sheet")
            .build();
    }

    @Override
    public JsonObject getConfigurationDescription() {
        return Json.createObjectBuilder()
            .add("filePath", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Uri/Path of the Excel file")
                    .add("de", "Uri/Path of the Excel file"))
                .add("value", "")
                .add("moreInfos", Json.createObjectBuilder()
                    .add("requireUpload", true)))
            .add("sheetNumber", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Sheet Number")
                    .add("de", "Sheet Number"))
                .add("value", ""))
            .add("password", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Excel file password (OPTIONAL)")
                    .add("de", "Excel file password (OPTIONAL)"))
                .add("value", ""))
            .add("cellSeries", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Comma separated list or rage of columns/rows that represent the set of cells where the series of data are described")
                    .add("de", "Comma separated list or rage of columns/rows that represent the set of cells where the series of data are described"))
                .add("value", ""))
            .add("cellValues", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Comma separated list or rage of columns/rows that represent the set of cells that contain the data of the series")
                    .add("de", "Comma separated list or rage of columns/rows that represent the set of cells that contain the data of the series"))
                .add("value", ""))
            .build();
    }
    
    @Override
    public JsonObject obtainData(JsonObject configuration) throws Exception {
        String filePath = configuration.getJsonObject("filePath").getString("value");
        if(filePath.isEmpty()) throw new Exception("Excel file path not provided");
        String password = configuration.getJsonObject("password").getString("value");
        Integer sheetNumber = -1;
        try {
            sheetNumber = Integer.parseInt(configuration.getJsonObject("sheetNumber").getString("value"));
        }catch(Exception ex) {
            throw new Exception("The Excel sheet page number is incorrect: '"+configuration.getJsonObject("sheetNumber").getString("value")+"'");
        }
        if(sheetNumber < 1) throw new Exception("The Excel sheet page number must be greater then 0");
        String cellSeries = configuration.getJsonObject("cellSeries").getString("value").replace(" ", "").toUpperCase();
        if(cellSeries.isEmpty()) throw new Exception("Excel cell series not provided");
        String cellValues = configuration.getJsonObject("cellValues").getString("value").replace(" ", "").toUpperCase();
        if(cellValues.isEmpty()) throw new Exception("Excel cell values not provided");
        
        InputStream input = null;
        try{
            input = filePath.startsWith("http")?new URL(filePath).openStream():new FileInputStream(new File(Utils.processLocalFilePath(filePath)));
            
            Workbook workbook = WorkbookFactory.create(input, password!=""?password:null);
            Sheet sheet = workbook.getSheetAt(sheetNumber-1);
    
            DataFormatter dataFormatter = new DataFormatter();
            
            JsonArrayBuilder columnList = Json.createArrayBuilder();
            JsonArrayBuilder dataList = Json.createArrayBuilder();
            String[] cellSeriesSplit = cellSeries.split(";");
            if(cellSeriesSplit.length != 2) throw new Exception("Excel cell series format incorrect: "+cellSeries);
            if(cellSeriesSplit[0].isEmpty()) throw new Exception("Excel title cell for the series not provided");
            if(cellSeriesSplit[1].isEmpty()) throw new Exception("Excel cell series not provided");
            
            ArrayList<Integer> cellValueList = new ArrayList<Integer>();
            boolean seriesOnColumns = isNumber(cellSeries.charAt(0));
            int seriesIndex = seriesOnColumns?Integer.parseInt(cellSeriesSplit[0])-1:convertColumnToNumber(cellSeriesSplit[0]);
            cellValueList.add(seriesIndex);
            for(String cellValue : cellValues.split(",")){
                if(cellValue.contains("-")){
                    String[] cellValueRangeSplit = cellValue.split("-");
                    if(cellValueRangeSplit.length != 2) throw new Exception("Excel cell value format incorrect: "+cellValue);
                    if(cellValueRangeSplit[0].isEmpty()) throw new Exception("Excel cell value range start not provided");
                    if(cellValueRangeSplit[1].isEmpty()) throw new Exception("Excel cell value range end not provided");
                    int cellValueStart = seriesOnColumns?Integer.parseInt(cellValueRangeSplit[0])-1:convertColumnToNumber(cellValueRangeSplit[0]);
                    int cellValueEnd = seriesOnColumns?Integer.parseInt(cellValueRangeSplit[1])-1:convertColumnToNumber(cellValueRangeSplit[1]);
                    boolean ascendentOrder = cellValueStart<=cellValueEnd;
                    for(int i=cellValueStart;(ascendentOrder)?i<=cellValueEnd:i>=cellValueEnd;i=(ascendentOrder)?i+1:i-1)
                        cellValueList.add(i);
                } else {
                    if(cellValue.isEmpty()) throw new Exception("Excel cell value not provided");
                    cellValueList.add(seriesOnColumns?Integer.parseInt(cellValue)-1:convertColumnToNumber(cellValue));
                }
            }
            
            for(int i=0;i<cellValueList.size();i++){
                JsonObjectBuilder dataObjJson = Json.createObjectBuilder();
                for(String cellSerie : cellSeriesSplit[1].split(",")){
                    if(cellSerie.isEmpty()) throw new Exception("Excel cell serie not provided");
                    String[] cellSerieRangeSplit = cellSerie.split("-");
                    if(cellSerieRangeSplit.length > 2) throw new Exception("Excel cell serie format incorrect: "+cellSerie);
                    if(cellSerieRangeSplit[0].isEmpty()) throw new Exception((cellSerieRangeSplit.length == 2)?"Excel cell serie range start not provided":"Excel cell serie not provided");
                    if(cellSerieRangeSplit.length == 2 && cellSerieRangeSplit[1].isEmpty()) throw new Exception("Excel cell serie range end not provided");
                    int cellSerieStart = seriesOnColumns?convertColumnToNumber(cellSerieRangeSplit[0]):Integer.parseInt(cellSerieRangeSplit[0])-1;
                    int cellSerieEnd = (cellSerieRangeSplit.length == 2)?seriesOnColumns?convertColumnToNumber(cellSerieRangeSplit[1]):Integer.parseInt(cellSerieRangeSplit[1])-1:cellSerieStart;
                    boolean ascendentOrder = cellSerieStart<=cellSerieEnd;
                    for(int j=cellSerieStart;(ascendentOrder)?j<=cellSerieEnd:j>=cellSerieEnd;j=(ascendentOrder)?j+1:j-1)
                        if(i==0)
                            columnList.add(dataFormatter.formatCellValue(sheet.getRow(seriesOnColumns?cellValueList.get(i):j).getCell(seriesOnColumns?j:cellValueList.get(i))));
                        else 
                            dataObjJson.add(
                                dataFormatter.formatCellValue(sheet.getRow(seriesOnColumns?seriesIndex:j).getCell(seriesOnColumns?j:seriesIndex)),
                                dataFormatter.formatCellValue(sheet.getRow(seriesOnColumns?cellValueList.get(i):j).getCell(seriesOnColumns?j:cellValueList.get(i)))
                            );
                }
                if(i!=0)
                    dataList.add(dataObjJson);
            }
            
            return Json.createObjectBuilder()
                .add("columns", columnList)
                .add("data", dataList)
                .build();            
        }finally{
            if(input!=null)
                input.close();
        }
    }
    
    private boolean isNumber(char character){
        return character >= '0' && character <= '9';
    }
    
    private int convertColumnToNumber(String columnUpperCase){
        int sum = 0;        
        for (int i = 0; i < columnUpperCase.length(); i++)
            sum = (sum * 26) + (columnUpperCase.charAt(i) - 'A' + 1);
        return sum-1;
    }

    @Override
    public boolean isOutputStructured() {
        return true;
    }
    /*
    public static void main(String[] argv){
        try{
            DSModuleI module = new DSExcel();
            JsonObject config = Json.createObjectBuilder()
                    .add("filePath", Json.createObjectBuilder().add("value", "D:\\ADOXX.ORG\\DASHBOARD\\dashboard_src\\src\\main\\resources\\dsExcelTest.xlsx"))
                    .add("sheetNumber", Json.createObjectBuilder().add("value", "1"))
                    .add("password", Json.createObjectBuilder().add("value", ""))
                    .add("cellSeries", Json.createObjectBuilder().add("value", "2;B,E-C")) //B;7,8-10
                    .add("cellValues", Json.createObjectBuilder().add("value", "3-4")) //C,D
                    .build();
            System.out.println(module.obtainData(config));
        }catch(Exception ex){ex.printStackTrace();}
    }
    */
}
