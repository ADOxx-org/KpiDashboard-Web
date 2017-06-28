Dashboard.addWidget({
    
    getId : function(){
        return 'table-chart-widget';
    },
    
    getName : function(){
        return 'Table Chart';
    },
    
    getDescription : function(){
        return {
            en : 'Widget that display a KPI in a table',
            de : 'Widget that display a KPI in a table'
        };
    },
    
    getIconClass : function(){
        return 'glyphicon glyphicon-th-list';
    },
    
    createContent : function(configuration, currentWidgetInstanceId){
        var kpiInfo = ModelManager.getKpiInfo(configuration.modelId.value, configuration.kpiId.value);
        var kpiMeasure = Dashboard.evaluateKpi(currentWidgetInstanceId, configuration.modelId.value, configuration.kpiId.value);

        var tableHtml = '<table class="table table-condensed table-hover"><tr>';
        kpiMeasure.columns.forEach(function(item){
            tableHtml += '<th>'+item+'</th>';
        });
        tableHtml += '</tr>';
        kpiMeasure.data.forEach(function(dataItem){
            tableHtml += '<tr>';
            kpiMeasure.columns.forEach(function(columnName){
                tableHtml += '<td>' + (dataItem[columnName]!=null?dataItem[columnName] + ' ' + kpiInfo.getFieldInfos(columnName).measureUnit:'')  + '</td>';
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</table>';
            
        var node = $('<div class="table-responsive">')
            .append(
                $('<p>' + configuration.title.value + '</p>')
            )
            .append(
                $('<p>' + kpiInfo.description + '</p>')
            )
            .append(
                $(tableHtml)
            )
        ;

        //throw 'aa';
        return node;
    },
    
    getConfiguration : function(){
        return {
            
            title : {
                description : {
                    en : '',
                    de : ''
                },
                value : ''
            },
            
            modelId : {
                description : {
                    en : '',
                    de : ''
                },
                value : ''
            },
            kpiId : {
                description : {
                    en : '',
                    de : ''
                },
                value : ''
            }
        };
    },
    
    createConfiguration : function(presetConfig){
        
        var node = $('<div>')
            .append(
                $('<label>Provide a title for the table: </label><input type="text" id="tableTitleTxt" value="">')
            )
            .append("<br>")
            .append(
                $('<label>', {text : 'Select the KPI: ', for : 'modelSelect'})
            )
            .append(" ")
            .append(
                    $('<select>', {id : 'modelSelect'})
                        .change(function(){
                            var kpiSelect = node.find('#kpiSelect');
                            var modelId = node.find('#modelSelect').find(":selected").val();
                            kpiSelect.empty();
                            kpiSelect.append('<option value="">--KPI--</option>');
                            ModelManager.getKpiList(modelId).forEach(function(item){
                                kpiSelect.append('<option value="' + item.id + '">' + item.name + '</option>');
                            }, this);
                        })
                        .append(function(){
                            var modelSelectArray = [
                                '<option value="">--Model--</option>'
                            ];
                            ModelManager.getKpiModelList().forEach(function(item){
                                modelSelectArray.push('<option value="' + item.id + '">' + item.name + '</option>');
                            }, this);
                            return modelSelectArray;
                        }.call())
            )
            .append(" ")
            .append(
                    $('<select>', {id : 'kpiSelect'})
                        .append(function(){
                            return [
                                '<option value="">--KPI--</option>'
                            ];
                        }.call())
            )
        ;
        
        if(presetConfig != null){
            node.find('#tableTitleTxt').val(presetConfig.title.value);
            node.find('#modelSelect').val(presetConfig.modelId.value);
            node.find('#modelSelect').trigger("change");
            node.find('#kpiSelect').val(presetConfig.kpiId.value);
            node.find('#kpiSelect').trigger("change");
        }
        
        var okHandler = function(){
            var title = node.find('#tableTitleTxt').val();
            var modelId = node.find('#modelSelect').find(":selected").val();
            var kpiId = node.find('#kpiSelect').find(":selected").val();
            
            if(modelId === '' || kpiId === '')
                throw 'modelId or kpiId not correctly provided';
            
            ModelManager.getKpiInfo(modelId, kpiId);
            
            return {
                title : {value : title},
                modelId : {value : modelId},
                kpiId : {value : kpiId}
            }
        }; 
        
        return {
            nodeElement : node,
            okHandler : okHandler
        };
    },
    
    getPreferredSize : function(){
        return {w:4, h:4};
    }
});