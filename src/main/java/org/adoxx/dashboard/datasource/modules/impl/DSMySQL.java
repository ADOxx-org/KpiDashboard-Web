package org.adoxx.dashboard.datasource.modules.impl;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;

import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;

import org.adoxx.dashboard.datasource.modules.DSModuleI;

import com.mysql.cj.jdbc.MysqlDataSource;

public class DSMySQL implements DSModuleI{

    @Override
    public String getUniqueName() {
        return "mysql-datasource";
    }

    @Override
    public JsonObject getDescription() {
        return Json.createObjectBuilder()
            .add("en", "Datasource for MySQL")
            .add("de", "Datenquelle für MySQL")
            .build();
    }

    @Override
    public JsonObject getConfigurationDescription() {
        return Json.createObjectBuilder()
            .add("host", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Server host")
                    .add("de", "Server host"))
                .add("value", ""))
            .add("port", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Server port")
                    .add("de", "Server port"))
                .add("value", ""))
            .add("database", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Database name")
                    .add("de", "Database name"))
                .add("value", ""))
            .add("username", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Username")
                    .add("de", "Username"))
                .add("value", ""))
            .add("password", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Password")
                    .add("de", "Password"))
                .add("value", ""))
            .add("query", Json.createObjectBuilder()
                .add("description", Json.createObjectBuilder()
                    .add("en", "Query")
                    .add("de", "Query"))
                .add("value", ""))
            .build();
    }

    @Override
    public JsonObject obtainData(JsonObject configuration) throws Exception {
        String host = configuration.getJsonObject("host").getString("value");
        Integer port = Integer.parseInt(configuration.getJsonObject("port").getString("value"));
        String database = configuration.getJsonObject("database").getString("value");
        String username = configuration.getJsonObject("username").getString("value");
        String password = configuration.getJsonObject("password").getString("value");
        String query = configuration.getJsonObject("query").getString("value");
        
        if(!query.toLowerCase().startsWith("select"))
            throw new Exception("Only SELECT queries allowed");
        
        MysqlDataSource dataSource = new MysqlDataSource();
        dataSource.setServerName(host);
        dataSource.setPortNumber(port);
        dataSource.setDatabaseName(database);
        dataSource.setUser(username);
        dataSource.setPassword(password);
        
        JsonArrayBuilder columnList = Json.createArrayBuilder();
        JsonArrayBuilder dataList = Json.createArrayBuilder();
        
        try (Connection connection = dataSource.getConnection()) {
            try (PreparedStatement statement = connection.prepareStatement(query)) {
                try (ResultSet resultSet = statement.executeQuery()) {
                    ResultSetMetaData metadata = resultSet.getMetaData();
                    for(int i=1;i<=metadata.getColumnCount();i++)
                        columnList.add(metadata.getColumnName(i));
                    while (resultSet.next()) {
                        JsonObjectBuilder dataObject = Json.createObjectBuilder();
                        for(int i=1;i<=metadata.getColumnCount();i++)
                            dataObject.add(metadata.getColumnName(i), resultSet.getString(i));
                        dataList.add(dataObject);
                    }
                }
            }
        }
        
        return Json.createObjectBuilder()
            .add("columns", columnList)
            .add("data", dataList)
            .build();
    }

    @Override
    public boolean isOutputStructured() {
        return true;
    }
}
