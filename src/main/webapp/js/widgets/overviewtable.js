Dashboard.addWidget({
    
    getId : function(){
        return 'table-overview-widget';
    },
    
    getName : function(){
        return 'Table Overview';
    },
    
    getDescription : function(){
        return {
            en : 'Widget that display a tabular overview of the current model and goals status',
            de : 'Widget that display a tabular overview of the current model and goals status'
        };
    },
    
    getIconClass : function(){
        return 'glyphicon glyphicon-th-large';
    },
    
    createContent : function(configuration, currentWidgetInstanceId){
        var displayedGoalIdList = [];
        var displayedKpiIdList = [];
        
        var numModels = 0;
        var numKpi = 0;
        var numGoals = 0;
        var numErrors = 0;
        var numGoalSuccess = 0;
        var numGoalFailure = 0;
        var numGoalUnknown = 0;
        
        var infoList = {};
        
        ModelManager.getKpiModelList().forEach(function(modelItem){
            numModels++;
            infoList[modelItem.id] = {
                modelName : modelItem.name,
                objList : {}
            };
            
            ModelManager.getTopLevelElementList(modelItem.id).forEach(function(item){
                var _countRec = function(modelId, isGoal, objInfo){
                    if(isGoal){
                        if(displayedGoalIdList.indexOf(objInfo.id) != -1)
                            return;
                        displayedGoalIdList.push(objInfo.id);
                    } else {
                        if(displayedKpiIdList.indexOf(objInfo.id) != -1)
                            return;
                        displayedKpiIdList.push(objInfo.id);
                    }
                    
                    if(isGoal)
                        numGoals++;
                    else
                        numKpi++;
                    
                    var measure = null;
                    var errorDescription = null;
                    try{
                        measure = isGoal ? Dashboard.evaluateGoal(currentWidgetInstanceId, modelId, objInfo.id) : Dashboard.evaluateKpi(currentWidgetInstanceId, modelId, objInfo.id);
                    }catch(e){
                        errorDescription = e;
                        numErrors++;
                    }
                    
                    infoList[modelItem.id].objList[objInfo.id] = {
                        objectName : objInfo.name,
                        isGoal : isGoal,
                        measure : measure,
                        errorDescription : errorDescription
                    };
                    
                    if(measure != null){
                        if(isGoal && measure.status>0)
                            numGoalSuccess++;
                        if(isGoal && measure.status<0)
                            numGoalFailure++;
                        if(isGoal && measure.status==0)
                            numGoalUnknown++;
                    }
                    
                    if(isGoal)
                        objInfo.requiredGoalList.forEach(function(item){
                            _countRec(modelId, true, item);
                        });
                    
                    objInfo.requiredKpiList.forEach(function(item){
                        _countRec(modelId, false, item);
                    });
                };
                
                var objInfo = item.isAGoal?ModelManager.getGoalInfo(modelItem.id, item.id):ModelManager.getKpiInfo(modelItem.id, item.id);
                _countRec(modelItem.id, item.isAGoal, objInfo);
            });
        });

        var _createCircleCode = function(color){
            return'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="'+color+'" /></svg>';
        }
        
        var ret = $('<table class="table table-bordered">').append(
            $('<tbody>').append(
                $('<tr class="success">\
                        <th class="center-horizontal">Total models</th>\
                        <th class="center-horizontal">Total KPIs</th>\
                        <th class="center-horizontal">Total Goals</th>\
                        <th class="center-horizontal">Errors</th>\
                        <th class="center-horizontal">Succeeded Goals </th>\
                        <th class="center-horizontal">Failed Goals</th>\
                        <th class="center-horizontal">Unevaluable Goals</th>\
                   </tr>\
                ')
            ).append(
                $('<tr>').append(
                    $('<td><h3 class="center-horizontal">'+numModels+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Total Models Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            html += '<tr><th>Models</th></tr>';
                            for(var modelInfoKey in infoList)
                                html += '<tr><td>'+infoList[modelInfoKey].modelName+'</td></tr>';
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                ).append(
                    $('<td><h3 class="center-horizontal">'+numKpi+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Total KPIs Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            for(var modelInfoKey in infoList){
                                html += '<tr><th>'+infoList[modelInfoKey].modelName+'</th></tr>';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    if(infoList[modelInfoKey].objList[objInfoKey].isGoal === false)
                                        html += '<tr><td>'+infoList[modelInfoKey].objList[objInfoKey].objectName+'</td></tr>';
                                }
                            }
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                ).append(
                    $('<td><h3 class="center-horizontal">'+numGoals+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Total Goals Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            for(var modelInfoKey in infoList){
                                html += '<tr><th>'+infoList[modelInfoKey].modelName+'</th></tr>';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    if(infoList[modelInfoKey].objList[objInfoKey].isGoal === true)
                                        html += '<tr><td>'+infoList[modelInfoKey].objList[objInfoKey].objectName+'</td></tr>';
                                }
                            }
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                ).append(
                    $('<td><h3 class="center-horizontal">'+numErrors+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Errors Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            for(var modelInfoKey in infoList){
                                var trHead = '<tr><th>Errors in '+infoList[modelInfoKey].modelName+' Goals:</th><th></th></tr>';
                                var trBody = '';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    var obj = infoList[modelInfoKey].objList[objInfoKey];
                                    if(obj.isGoal === true && obj.measure === null && obj.errorDescription != null)
                                        trBody += '<tr><td>'+obj.objectName+'</td><td>'+obj.errorDescription+'</td></tr>';
                                }
                                if(trBody != '')
                                    html += trHead + trBody;
                                
                                trHead = '<tr><th>Errors in '+infoList[modelInfoKey].modelName+' KPIs:</th><th></th></tr>';
                                trBody = '';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    var obj = infoList[modelInfoKey].objList[objInfoKey];
                                    if(obj.isGoal === false && obj.measure === null && obj.errorDescription != null)
                                        trBody += '<tr><td>'+obj.objectName+'</td><td>'+obj.errorDescription+'</td></tr>';
                                }
                                if(trBody != '')
                                    html += trHead + trBody;
                            }
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                ).append(
                    $('<td><h3 class="center-horizontal">'+numGoalSuccess+' '+_createCircleCode('green')+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Succeeded Goals Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            for(var modelInfoKey in infoList){
                                html += '<tr><th>'+infoList[modelInfoKey].modelName+'</th></tr>';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    var obj = infoList[modelInfoKey].objList[objInfoKey];
                                    if(obj.isGoal === true && obj.measure !== null && obj.measure.status>0)
                                        html += '<tr><td>'+obj.objectName+'</td></tr>';
                                }
                            }
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                ).append(
                    $('<td><h3 class="center-horizontal">'+numGoalFailure+' '+_createCircleCode('red')+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Failed Goals Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            for(var modelInfoKey in infoList){
                                html += '<tr><th>'+infoList[modelInfoKey].modelName+'</th></tr>';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    var obj = infoList[modelInfoKey].objList[objInfoKey];
                                    if(obj.isGoal === true && obj.measure !== null && obj.measure.status<0)
                                        html += '<tr><td>'+obj.objectName+'</td></tr>';
                                }
                            }
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                ).append(
                    $('<td><h3 class="center-horizontal">'+numGoalUnknown+' '+_createCircleCode('grey')+'</h3></td>').popover({
                        placement : 'auto right',
                        container : 'body',
                        html : true,
                        title : 'Unevaluable Goals Details',
                        content : function(){
                            var html = '<table class="table table-condensed">';
                            for(var modelInfoKey in infoList){
                                html += '<tr><th>'+infoList[modelInfoKey].modelName+'</th></tr>';
                                for(var objInfoKey in infoList[modelInfoKey].objList){
                                    var obj = infoList[modelInfoKey].objList[objInfoKey];
                                    if(obj.isGoal === true && obj.measure !== null && obj.measure.status==0)
                                        html += '<tr><td>'+obj.objectName+'</td></tr>';
                                }
                            }
                            html += '<table>';
                            return html;
                        }(),
                        trigger : 'hover'
                    })
                )
            )
        );
        
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
        return {w:10, h:3};
    }
});