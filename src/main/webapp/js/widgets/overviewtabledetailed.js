Dashboard.addWidget({
    
    getId : function(){
        return 'table-overview-detailed-widget';
    },
    
    getName : function(){
        return 'Table Overview Detailed';
    },
    
    getDescription : function(){
        return {
            en : 'Widget that display a detailed tabular overview of the current model and goals status',
            de : 'Widget that display a detailed tabular overview of the current model and goals status'
        };
    },
    
    getIconClass : function(){
        return 'glyphicon glyphicon-th';
    },
    
    createContent : function(configuration, currentWidgetInstanceId){

        var treeJson = ModelManager.buildModelTreeStructure();
        
        var _formatGoalStatusAsTrafficLightCode = function(status){
            var _createCircleCode = function(color){
                return'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="'+color+'" /></svg>';
            }
            if(status == null)
                return _createCircleCode('lightgrey')+' '+_createCircleCode('lightgrey')+' '+_createCircleCode('lightgrey');
            
            return _createCircleCode(status>0?'green ':'lightgrey')+' '+_createCircleCode(status==0?'grey ':'lightgrey')+' '+_createCircleCode(status<0?'red ':'lightgrey');
        }

        var _formatKpiValue = function(value, measureUnit){
            if(value == null)
                value = '--';
            return '<div style="font-size:large;">' + value + ' ' + measureUnit + '</div>';
        };
        
        var tableNode = $('<table class="table table-condensed table-hover">');
        
        var ret = tableNode.append(
            $('<tbody>').append(function(){
                var toAppend = [];
                
                var _appendRowRec = function(node, levelNum){
                    
                    var _getSpaces = function(){
                        var ret = '';
                        for(var i=0;i<levelNum*4;i++)
                            ret += '&nbsp;';
                        return ret;
                    };
                    
                    var measure = null;
                    var lastValue = null;
                    var errorMsg = null;
                    var objInfo = null;
                    var valueToDisplay = '';
                    
                    if(node.model_id!=null && node.object_id!= null){
                        try{
                            measure = node.isAGoal ? Dashboard.evaluateGoal(currentWidgetInstanceId, node.model_id, node.object_id) : Dashboard.evaluateKpi(currentWidgetInstanceId, node.model_id, node.object_id);
                            lastValue = node.isAGoal ? measure.status : ((measure.data.length>0 && measure.columns.length>0)?measure.data[0][measure.columns[0]]:null);
                        }catch(e){
                            errorMsg = e;
                        }
                        
                        objInfo = node.isAGoal?ModelManager.getGoalInfo(node.model_id, node.object_id):ModelManager.getKpiInfo(node.model_id, node.object_id);
                        
                        valueToDisplay = node.isAGoal ? _formatGoalStatusAsTrafficLightCode(lastValue) : _formatKpiValue(lastValue, (measure!=null && measure.columns.length>0)?objInfo.getFieldInfos(measure.columns[0]).measureUnit:'');
                    }
                    
                    toAppend.push($('<tr>')
                        .attr('data-levelId', node.levelId)
                        .attr('data-visibleChilds', 'true')
                        .attr('data-model_id', node.model_id)
                        .attr('data-isAGoal', node.isAGoal)
                        .attr('data-object_id', node.object_id)
                        .attr('data-lastValue', lastValue)
                        
                    .append(
                        $('<td class="link">' + _getSpaces() + (node.nodes!=null && node.nodes.length!=0?'<span class="glyphicon glyphicon-chevron-down"></span> ':'<span></span> ') + '<span class="' + node.icon + '"></span> ' + node.text + '</td>')
                            .click(function(){
                                if(node.nodes == null || node.nodes.length == 0)
                                    return;
                                
                                if($(this.parentNode).attr('data-visibleChilds') == 'true'){
                                    ret.find('tr[data-levelId ^= "'+node.levelId+'-"]').hide();
                                    $(this).parent().attr('data-visibleChilds', 'false');
                                } else {
                                    ret.find('tr[data-levelId ^= "'+node.levelId+'-"]').show();
                                    $(this).parent().attr('data-visibleChilds', 'true');
                                    var firstSpan = ret.find('tr[data-levelId ^= "'+node.levelId+'-"]').find('span').first();
                                    if(firstSpan.hasClass('glyphicon-chevron-right')){
                                        firstSpan.removeClass('glyphicon-chevron-right');
                                        firstSpan.addClass('glyphicon-chevron-down');
                                    }
                                }
                                
                                $(this).find('span').first().toggleClass('glyphicon-chevron-right');
                                $(this).find('span').first().toggleClass('glyphicon-chevron-down');
                            })
                    ).append(
                        $('<td>'+valueToDisplay+'</td>').popover({
                            placement : 'auto right',
                            container : 'body',
                            html : true,
                            title : node.text + ' details',
                            content : function(){

                                var html = '<p>'+node.description+'</p>';
                                
                                if(objInfo == null)
                                    return html;
                                
                                if(errorMsg != null){
                                    html += '<p> <b>Error Occurred: </b>'+errorMsg+'</p>';
                                    return html;
                                }
                                
                                html += '<table class="table table-condensed table-hover">';
                                if(measure==null)
                                    throw 'Unexpected Exception!';
                                
                                if(node.isAGoal){
                                    html += '<tr><th>Details</th><th>Values</th></tr>';
                                    html += '<tr><td>status</td><td>'+(measure.status==0?'UNKNOWN':(measure.status>0?'SUCCESS':'FAILURE'))+'</td></tr>';
                                    for(var moreInfoKey in measure.moreInfo)
                                        html += '<tr><td>'+moreInfoKey+'</td><td>'+measure.moreInfo[moreInfoKey]+'</td></tr>';
                                } else {
                                    html += '<tr>';
                                    measure.columns.forEach(function(item){
                                        html += '<th>'+item+'</th>';
                                    });
                                    html += '</tr>';
                                    measure.data.forEach(function(dataItem, index){
                                        if(index > 10)
                                            return;
                                        html += '<tr>';
                                        measure.columns.forEach(function(columnName){
                                            html += '<td>' + (dataItem[columnName]!=null?dataItem[columnName] + ' ' + objInfo.getFieldInfos(columnName).measureUnit :'')  + '</td>';
                                        });
                                        html += '</tr>';
                                    });
                                    if(measure.data.length > 10){
                                        html += '<tr>';
                                        measure.columns.forEach(function(item, i){
                                            html += '<td>'+(i==0?'...':'')+'</td>';
                                        });
                                        html += '</tr>';
                                    }
                                    if(measure.data.length == 0){
                                        html += '<tr>No information available</tr>';
                                    }
                                }
                                html += '</table>';
                                return html;
                            }(),
                            trigger : 'hover'
                        })
                    ));
                    
                    if(node.nodes!=null)
                        node.nodes.forEach(function(item){
                            _appendRowRec(item, levelNum+1);
                        });
                };
                
                _appendRowRec(treeJson, 0);
                
                return toAppend;
            }())
        );
        
        Dashboard.GeneralFilters.onFilterBySelectionClick(function(e){
            var levelId = null;
            ret.find('tr').each(function(index, trDom){
                var tr = $(trDom);
                if(tr.attr('data-model_id') == e.modelId && tr.attr('data-isAGoal') == (e.isGoal!=null?''+e.isGoal:null) && tr.attr('data-object_id') == e.objectId)
                    levelId = tr.attr('data-levelId');
            });
            if(levelId == null)
                throw 'Unexpected Error: Impossible to find the levelId';
            
            ret.find('tr:not([data-levelId ^= "'+levelId+'"])').hide();
            ret.find('tr').each(function(index, trDom){
                var tr = $(trDom);
                if(levelId.startsWith(tr.attr('data-levelId')))
                    tr.show();
            });
            ret.find('tr[data-levelId ^= "'+levelId+'"]').show();
        });
        
        
        Dashboard.GeneralFilters.onFilterByValuesChange(function(e){
            var showSuccessGoal = e.showSuccessGoal;
            var showFailureGoal = e.showFailureGoal;
            var showUnknownGoal = e.showUnknownGoal;
            var minKpiVal = e.minKpiVal;
            var sameKpiVal = e.sameKpiVal;
            var maxKpiVal = e.maxKpiVal;
            
            ret.find('tr').each(function(index, trDom){
                var tr = $(trDom);
                if(tr.attr('data-model_id')==null || tr.attr('data-isAGoal')==null || tr.attr('data-object_id')==null)
                    tr.show();
                else {
                    
                    if(tr.attr('data-isAGoal')=='true'){
                        tr.hide();
                        if(showSuccessGoal && tr.attr('data-lastValue') > 0)
                            tr.show();
                        if(showFailureGoal && tr.attr('data-lastValue') < 0)
                           tr.show();
                        if(showUnknownGoal && tr.attr('data-lastValue') == 0)
                            tr.show(); 
                    } else {
                        tr.show();
                        if(minKpiVal != '' && !(tr.attr('data-lastValue') > minKpiVal))
                            tr.hide();
                        if(sameKpiVal != '' && !(tr.attr('data-lastValue') == sameKpiVal))
                            tr.hide();
                        if(maxKpiVal != '' && !(tr.attr('data-lastValue') < maxKpiVal))
                            tr.hide();
                    }
                }
            });
        });
        
        
        return ret;
    },
    
    getConfiguration : function(){
        return {};
    },
    
    createConfiguration : function(presetConfig){
        return {
            nodeElement : null,
            okHandler : function(){return {};}
        };
    },
    
    getPreferredSize : function(){
        return {w:10, h:10};
    }
});