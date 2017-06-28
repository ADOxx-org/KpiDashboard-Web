package org.adoxx.dashboard.datasource.utils;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.xml.bind.DatatypeConverter;

public class Utils {
    
    public static String getCurrentTime(){
        //2017-03-16T17:00:00
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }
    
    public static String checkDate(String date) throws Exception{
        //2017-03-16T17:00:00
        if(date.length()!=19)
            throw new Exception("Incorrect date: " + date);
        try{
            System.out.println(Integer.parseInt(date.substring(0, 4)));
            System.out.println(Integer.parseInt(date.substring(5, 7)));
            System.out.println(Integer.parseInt(date.substring(8, 10)));
            System.out.println(Integer.parseInt(date.substring(11, 13)));
            System.out.println(Integer.parseInt(date.substring(14, 16)));
            System.out.println(Integer.parseInt(date.substring(17, 19)));
        }catch(Exception ex){
            throw new Exception("Incorrect date: " + date);
        }
        return date;
    }
    
    public static class HttpResults{
        public byte[] data;
        public Map<String, List<String>> headerMap;
    }
    
    public static HttpResults sendHTTP(String url, String mode, String dataToSend, ArrayList<String[]> htmlHeaderList, boolean ignoreSSLSelfSigned, boolean ignoreSSLWrongCN) throws Exception{
        
        //System.setProperty("java.net.useSystemProxies", "true");
        
        if(ignoreSSLSelfSigned){
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, new TrustManager[]{
                    new X509TrustManager() {
                        public java.security.cert.X509Certificate[] getAcceptedIssuers() { return null; }
                        public void checkClientTrusted(java.security.cert.X509Certificate[] certs, String authType) {}
                        public void checkServerTrusted(java.security.cert.X509Certificate[] certs, String authType) {}
                    }
                }, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
        }
        
        if(ignoreSSLWrongCN){
            HttpsURLConnection.setDefaultHostnameVerifier(new HostnameVerifier() {
                public boolean verify(String hostname, javax.net.ssl.SSLSession session) { return true; }
            });
        }
        
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        
        if(htmlHeaderList != null)
            for(String[] htmlHeader:htmlHeaderList)
                if(htmlHeader.length==2)
                    connection.setRequestProperty(htmlHeader[0], htmlHeader[1]);

        if(mode.equals("POST") && dataToSend != null){
            connection.setDoOutput(true);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Length", "" + Integer.toString(dataToSend.getBytes("UTF-8").length));
            
            DataOutputStream wr = new DataOutputStream(connection.getOutputStream());
            wr.write(dataToSend.getBytes("UTF-8"));
            wr.flush();
            wr.close();
        }
        
        byte[] output = new byte[0];
        if(connection.getResponseCode() >= 400)
            output = toByteArray(connection.getErrorStream());
        else
            output = toByteArray(connection.getInputStream());

        Map<String, List<String>> headerMap = connection.getHeaderFields();
        connection.disconnect();
        
        
        
        HttpResults ret = new HttpResults();
        ret.data = output;
        ret.headerMap = headerMap;
        return ret;
    }
    
    public static void copyInputStreamToOutputStream(InputStream input, OutputStream output) throws Exception{
        int n = 0;
        int DEFAULT_BUFFER_SIZE = 1024 * 1024 * 10;
        byte[] buffer = new byte[DEFAULT_BUFFER_SIZE];
        while (-1 != (n = input.read(buffer)))
            output.write(buffer, 0, n);
    }
    
    public static byte[] toByteArray(InputStream is) throws Exception{
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        copyInputStreamToOutputStream(is, out);
        byte[] ret = out.toByteArray();
        out.close();
        out = null;
        return ret;
    }
    
    public static byte[] readFile(String file) throws Exception{
        return readFile(new File(file));
    }
    
    public static byte[] readFile(File file) throws Exception{
        RandomAccessFile raf = new RandomAccessFile(file, "r");
        byte[] ret = new byte[(int)raf.length()];
        raf.read(ret);
        raf.close();
        return ret;
    }
    
    public static void writeFile(byte[] data, String filePath, boolean appendData) throws Exception{
        File file = new File(filePath);
        if(file.getParentFile()!= null && !file.getParentFile().exists())
            file.getParentFile().mkdirs();
        FileOutputStream fos = new FileOutputStream(new File(filePath), appendData);
        fos.write(data);
        fos.flush();
        fos.close();
    }
    
    public static byte[] base64Decode(String encodedData) {
        return DatatypeConverter.parseBase64Binary(encodedData);
    }
    
    public static String base64Encode(byte[] dataToEncode) {
        return DatatypeConverter.printBase64Binary(dataToEncode);
    }
    
    public static String processLocalFilePath(String path){
        if(path == null)
            return null;
        if(path.startsWith("_"))
            return System.getProperty("java.io.tmpdir")+"\\ADOxxDashboard_uploadedDS\\" + path;
        else
            return path;
    }
}
