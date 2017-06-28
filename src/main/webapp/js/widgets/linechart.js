Dashboard.addWidget({
    
    getId : function(){
        return "line-chart-widget";
    },
    
    getName : function(){
        return "Line Chart";
    },
    
    getDescription : function(){
        return {
            en : 'description',
            de : 'Beschreibung'
        };
    },
    
    getIconClass : function(){
        return '';
    },
    
    createContent : function(configuration, currentWidgetInstanceId){
        /*
         * creare un widget che mostra tutti i kpi ed i goal dal modello. Il widget deve poi essere in ascolto su un evento onFilterchange che aggiorna visualizzando solo i kpi permessi
         * */
    },
    
    
    getConfiguration : function(){
        
    },
    
    createConfiguration : function(presetConfig){
        return {
            nodeElement : null,
            okHandler : function(){}
        };
    },
    
    getPreferredSize : function(){
        return {w:4, h:4};
    }
});