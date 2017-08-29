Dashboard.addWidget({
    
    getId : function(){
        return 'panel-overview-widget';
    },
    
    getName : function(){
        return 'Panel Overview';
    },
    
    getDescription : function(){
        return {
            en : 'Widget that display a multi-panel view of the KPI model content',
            de : 'Widget that display a multi-panel view of the KPI model content'
        };
    },
    
    getIconClass : function(){
        return 'glyphicon glyphicon-filter';
    },
    
    createContent : function(configuration, currentWidgetInstanceId){
        
        var displayedGoalIdList = [];
        var displayedKpiIdList = [];
        
        var dataNode = $('<div class="treeDataView flexcontainer">');
        
        var filterNode = $('<div>');

        var _initializeFilterNode = function(){
            filterNode.empty();
            filterNode.append(
                $('\
                    <div class="panel panel-primary">\
                        <div class="panel-heading">\
                            <h3 class="panel-title"><span class="glyphicon glyphicon-filter"></span> Filter more...</h3>\
                        </div>\
                        <div class="panel-body">\
                            <div class="list-group">\
                                <a href="#" class="list-group-item"><p class="list-group-item-heading">Goal Status Filter:</p><div class="list-group-item-text"><input type="checkbox" id="successChk" checked>Success <input type="checkbox" id="failureChk" checked>Failure <input type="checkbox" id="unknownChk" checked>Unknown</div></a>\
                                <a href="#" class="list-group-item list-group-item-text"><p class="list-group-item-heading">KPI Value Filter:</p><div class="inline"><input id="greaterTxt" type="text" class="form-control" placeholder=">"> <input id="equalTxt" type="text" class="form-control" placeholder="="> <input id="lowerTxt" type="text" class="form-control" placeholder="<"></div></a>\
                            </div>\
                        </div>\
                    </div>\
                ')
            ).change(function(e){
                var showSuccessGoal = filterNode.find('#successChk').is(':checked');
                var showFailureGoal = filterNode.find('#failureChk').is(':checked');
                var showUnknownGoal = filterNode.find('#unknownChk').is(':checked');
                var minKpiVal = filterNode.find('#greaterTxt').val();
                var sameKpiVal = filterNode.find('#equalTxt').val();
                var maxKpiVal = filterNode.find('#lowerTxt').val();
                
                dataNode.find('div[isGoal="true"]').each(function(){
                    $(this).hide();
                    if(showSuccessGoal && $(this).attr('lastValue') > 0)
                        $(this).show();
                    if(showFailureGoal && $(this).attr('lastValue') < 0)
                        $(this).show();
                    if(showUnknownGoal && $(this).attr('lastValue') == 0)
                        $(this).show(); 
                });
                dataNode.find('div[isGoal="false"]').each(function(){
                    $(this).show();
                    if(minKpiVal != '' && !($(this).attr('lastValue') > minKpiVal))
                        $(this).hide();
                    if(sameKpiVal != '' && !($(this).attr('lastValue') == sameKpiVal))
                        $(this).hide();
                    if(maxKpiVal != '' && !($(this).attr('lastValue') < maxKpiVal))
                        $(this).hide();
                });
            });
            
            Dashboard.events.onFilterByValuesChange(function(e){
                var showSuccessGoal = e.showSuccessGoal;
                var showFailureGoal = e.showFailureGoal;
                var showUnknownGoal = e.showUnknownGoal;
                var minKpiVal = e.minKpiVal;
                var sameKpiVal = e.sameKpiVal;
                var maxKpiVal = e.maxKpiVal;
                
                filterNode.find('#successChk').prop('checked', showSuccessGoal);
                filterNode.find('#failureChk').prop('checked', showFailureGoal);
                filterNode.find('#unknownChk').prop('checked', showUnknownGoal);
                filterNode.find('#greaterTxt').val(minKpiVal);
                filterNode.find('#equalTxt').val(sameKpiVal);
                filterNode.find('#lowerTxt').val(maxKpiVal);
                
                dataNode.find('div[isGoal="true"]').each(function(){
                    $(this).hide();
                    if(showSuccessGoal && $(this).attr('lastValue') > 0)
                        $(this).show();
                    if(showFailureGoal && $(this).attr('lastValue') < 0)
                        $(this).show();
                    if(showUnknownGoal && $(this).attr('lastValue') == 0)
                        $(this).show(); 
                });
                dataNode.find('div[isGoal="false"]').each(function(){
                    $(this).show();
                    if(minKpiVal != '' && !($(this).attr('lastValue') > minKpiVal))
                        $(this).hide();
                    if(sameKpiVal != '' && !($(this).attr('lastValue') == sameKpiVal))
                        $(this).hide();
                    if(maxKpiVal != '' && !($(this).attr('lastValue') < maxKpiVal))
                        $(this).hide();
                });
            });
        };
        
        _initializeFilterNode();
        
        
        var _onCleanSelection = function(){
            dataNode.empty();
            displayedGoalIdList = [];
            displayedKpiIdList = [];
        };
        
        var _createWidgetPanel = function(modelId, isGoal, objInfo){
            
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
                return '<div style="font-size:x-large;">' + value + ' ' + measureUnit + '</div>';
            };
            
            var measure = null;
            var lastValue = null;
            var errorMsg = null;
            
            try{
                measure = isGoal ? Dashboard.evaluateGoal(currentWidgetInstanceId, modelId, objInfo.id) : Dashboard.evaluateKpi(currentWidgetInstanceId, modelId, objInfo.id);
                lastValue = isGoal ? measure.status : ((measure.data.length>0 && measure.columns.length>0)?measure.data[0][measure.columns[0]]:null);
            }catch(e){
                errorMsg = e;
            }
            
            var valueToDisplay = isGoal ? _formatGoalStatusAsTrafficLightCode(lastValue) : _formatKpiValue(lastValue, (measure!=null && measure.columns.length>0)?objInfo.getFieldInfos(measure.columns[0]).measureUnit:'');
            
            var panelDiv = $('<div modelId="'+modelId+'" objectId="'+objInfo.id+'" isGoal="'+isGoal+'" lastValue="'+lastValue+'" class="panel panel-'+(isGoal?(lastValue>0?'success':(lastValue<0?'danger':'warning')):'default')+'">').append(
                $('<div class="panel-heading">').append(
                    $('<h3 class="panel-title"><span class="glyphicon glyphicon-'+(isGoal?'record':'dashboard')+'"></span> ' + objInfo.name + '</h3>')
                )
            ).append(
                $('<div class="panel-body">').append(
                    $('<div class="center-horizontal">' + valueToDisplay + '</div>')
                ).popover({
                    placement : 'auto right',
                    container : 'body',
                    html : true,
                    title : objInfo.name + ' details',
                    content : function(){
                        var html = '<p>'+objInfo.description+'</p>';
                        if(errorMsg != null){
                            html += '<p> <b>Error Occurred: </b>'+errorMsg+'</p>';
                            return html;
                        }
                        
                        html += '<table class="table table-condensed table-hover">';
                        if(measure==null)
                            throw 'Unexpected Exception!';
                        
                        if(isGoal){
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
                        }
                        html += '</table>';
                        return html;
                    }(),
                    trigger : 'hover'
                })
            );
            return panelDiv;
        };
        
        var _onSelection = function(modelId, isGoal, objectId){
            console.log('modelId: ' + modelId + ' isGoal: ' + isGoal + ' objectId: ' + objectId);
            _onCleanSelection();
            
            var _appendGeneralWidget = function(modelId, isGoal, objId){
                
                var _appendGeneralWidgetRec = function(modelId, isGoal, objInfo){
                    if(isGoal){
                        if(displayedGoalIdList.indexOf(objInfo.id) != -1)
                            return;
                        displayedGoalIdList.push(objInfo.id);
                    } else{
                        if(displayedKpiIdList.indexOf(objInfo.id) != -1)
                            return;
                        displayedKpiIdList.push(objInfo.id);
                    }
                    
                    var panelDiv = _createWidgetPanel(modelId, isGoal, objInfo);

                    dataNode.append(panelDiv);
                    
                    if(isGoal)
                        objInfo.requiredGoalList.forEach(function(item){
                            _appendGeneralWidgetRec(modelId, true, item);
                        });
                    
                    objInfo.requiredKpiList.forEach(function(item){
                        _appendGeneralWidgetRec(modelId, false, item);
                    });
                };
                
                var objInfo = isGoal?ModelManager.getGoalInfo(modelId, objId):ModelManager.getKpiInfo(modelId, objId);
                _appendGeneralWidgetRec(modelId, isGoal, objInfo);
            };
            
            ModelManager.getKpiModelList().forEach(function(modelItem){
                if(modelId != null && modelItem.id != modelId)
                    return;
                
                if(objectId == null){
                    ModelManager.getTopLevelElementList(modelItem.id).forEach(function(item){
                        if(isGoal == null || item.isAGoal == isGoal)
                            _appendGeneralWidget(modelItem.id, item.isAGoal, item.id);
                    });
                } else {
                    _appendGeneralWidget(modelItem.id, isGoal, objectId);
                }
            });
            
            filterNode.trigger('change');
        };
        
        Dashboard.events.onFilterBySelectionClick(function(e){
            _onSelection(e.modelId, e.isGoal, e.objectId);
        });
        
        var treeNode = $('<div>').treeview({
            data : [ModelManager.buildModelTreeStructure()],
            color : "#428bca",
            expandIcon : 'glyphicon glyphicon-chevron-right',
            collapseIcon : 'glyphicon glyphicon-chevron-down',
            onNodeSelected : function(event, data) {
                _onSelection(data.model_id, data.isAGoal, data.object_id);
            },
            onNodeUnselected : function(event, data) {
                _onCleanSelection();
            },
        }).treeview('expandAll', { silent: true });
        
        
        /*
        var _createModelTreeNoDependencies = function(){
            var treeJson = this._generateJsonTreeFromModel();
            var _createModelRec = function(rootArrayJson){
                var ulNode = $('<ul class="list-group collapse in" id="'+Utils.generateUUID()+'">'); //list-group collapse in //navbar-collapse
                rootArrayJson.forEach(function(item){
                    ulNode.append(
                        function(item){
                            var ulNodeToAppend = item.nodes==null?null:_createModelRec(item.nodes);
                            var dataTarget = ulNodeToAppend==null?'':' data-parent="#' + ulNode.attr('id') + '" data-toggle="collapse" data-target="#' + ulNodeToAppend.attr('id') + '"';
                            return $('<li class="list-group-item">') //class="list-group-item"
                                .append(
                                    $('<div class="link" ' + dataTarget + '>' + (item.nodes!=null && item.nodes.length!=0?'<span class="glyphicon glyphicon-chevron-down"></span> ':'') + '<span class="' + item.icon + '"></span> ' + item.text + '</div>') //href="#"
                                        .click(function(e){
                                            _onSelection(item.model_id, item.isAGoal, item.object_id);
                                        })
                                )
                                .append(ulNodeToAppend)
                            ;
                        }.call(this, item)
                    );
                });
                return ulNode;
            };
            return $('<div class="treeView">').append(_createModelRec(treeJson));
        }.bind(this);
        
        var treeNode = _createModelTreeNoDependencies();
        */
        
        
        var ret = $('<div class="container-fluid row">').append(
            $('<div class="col-xs-6 col-md-4">')
                .append(treeNode)
                .append(filterNode)
        ).append(
            $('<div class="col-xs-12 col-sm-6 col-md-8">').append(dataNode)
        );
        
        _onSelection(null, null, null);
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
        return {w:10, h:6};
    }
});