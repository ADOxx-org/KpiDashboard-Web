var Dashboard = {
    datasourceUpdatingIntervallInSeconds : 5*60,
    preferredLang : null,
    widgetFileToLoadList : ['tablechart', 'overviewpanel', 'overviewtable', 'overviewtabledetailed'],
    
    setLang : function(lang){
        switch(lang){
            case 'en': this.preferredLang = 'en'; break;
            case 'de': this.preferredLang = 'de'; break;
            case 'es': this.preferredLang = 'es'; break;
            case 'pl': this.preferredLang = 'pl'; break;
            default : this.preferredLang = 'en'; break;
        }
    },
    
    addWidget : function(widget){
        if (typeof widget !== 'object')
            throw 'the widget is not a valid object';
        
        if(typeof widget.getId !== 'function')
            throw 'function getId not present';
        if(typeof widget.getName !== 'function')
            throw 'function getName not present';
        if(typeof widget.getDescription !== 'function')
            throw 'function getDescription not present';
        if(typeof widget.getIconClass !== 'function')
            throw 'function getIconClass not present';
        if(typeof widget.createContent !== 'function')
            throw 'function createContent not present';
        if(typeof widget.getConfiguration !== 'function')
            throw 'function getConfiguration not present';
        if(typeof widget.getPreferredSize !== 'function')
            throw 'function preferredSize not present';
        if(typeof widget.createConfiguration !== 'function' && widget.createConfiguration != null)
            throw 'createConfiguration, when specified, must be a function';
        
        widget = Object.assign(widget, {
            getDescriptionInLang : function(){
                if(Dashboard.preferredLang === null)
                    throw 'preferredLang is null';
                return this.getDescription()[Dashboard.preferredLang];
            }
        });
        
        this._internals._widgetSystem._widgetList.push(widget);
    },
    
    evaluateKpi : function(widgetInstanceId, modelId, kpiId){
        var currentWidgetInstanceId = widgetInstanceId;
        
        this._internals._filterSystem._updateWidgetInstanceFilterInfos(currentWidgetInstanceId, modelId, false, kpiId, null);
        
        var _calculateKpiRec = function(kpiInfoObj){
            var kpiMeasure = null;
            var dataSourceOutput = null;           
            
            if(kpiInfoObj.connectedDataSource != null){
                this._internals._datasourceCacheSystem._updateCachedDatasourceList(currentWidgetInstanceId, kpiInfoObj.connectedDataSource);
                var cachedDatasource = this._internals._datasourceCacheSystem._getCachedDatasource(currentWidgetInstanceId, kpiInfoObj.connectedDataSource.id);

                dataSourceOutput = Utils.clone(cachedDatasource.lastObtainedValue);
                
                if(dataSourceOutput == null)
                    throw 'Update the widget content';
                if(dataSourceOutput.error != null){
                    console.log('Error occurred in the DataWrapper module "'+dataSourceOutput.moduleName+'": '+dataSourceOutput.error+'\nConfiguration: '+dataSourceOutput.moduleConfiguration);
                    throw 'Error occurred in the DataWrapper module "'+dataSourceOutput.moduleName+'": '+dataSourceOutput.error;
                }
            }
            
            if(kpiInfoObj.connectedAlgorithm != null){
                if(kpiInfoObj.connectedAlgorithm.code == null || kpiInfoObj.connectedAlgorithm.code == '' || kpiInfoObj.connectedAlgorithm.code.indexOf('return ') === -1)
                    throw 'The algorithm with id ' + kpiInfoObj.connectedAlgorithm.id + ' must provide a javascript code with a return statement in the end';
                    
                var requiredKpiValueList = [];
                
                kpiInfoObj.requiredKpiList.forEach(function(requiredKpiInfo){
                    requiredKpiValueList.push({
                        id : requiredKpiInfo.id,
                        name : requiredKpiInfo.name,
                        description : requiredKpiInfo.description,
                        fields :  requiredKpiInfo.fields,
                        value : _calculateKpiRec(requiredKpiInfo)
                    });
                    
                }.bind(this));
                
                var algF = new Function('dataSourceOutput', 'requiredKpiValueList', kpiInfoObj.connectedAlgorithm.code);
                
                try{
                    requiredKpiValueList = Utils.clone(requiredKpiValueList);
                    kpiMeasure = algF(dataSourceOutput, requiredKpiValueList);
                    if(kpiMeasure == null)
                        throw 'The returned kpi measure is null';
                }catch(e){
                    throw 'Error generated in the algorithm for the kpi with id ' + kpiInfoObj.id + ' in the model ' + modelId + ':\n' + e;
                }
            } else {
                kpiMeasure = dataSourceOutput;
            }
            
            if(kpiMeasure == null)
                throw 'kpiMeasure is null; connectedDataSource and connectedAlgorithm cannot be both null';
            
            if(!Array.isArray(kpiMeasure.columns) || !Array.isArray(kpiMeasure.data))
                throw 'The kpi measure have an incorrect format: Expected {columns:[...], data:[...]} Obtained:\n' + JSON.stringify(kpiMeasure);
            
            for(var i=0;i<kpiInfoObj.fields.length;i++)
                if(kpiMeasure.columns.indexOf(kpiInfoObj.fields[i].name) === -1)
                    throw 'The kpi measure miss the required field "' + kpiInfoObj.fields[i].name + '"';
            
            return kpiMeasure;
        }.bind(this);
        
        var kpiInfo = ModelManager.getKpiInfo(modelId, kpiId);
        
        var ret = _calculateKpiRec(kpiInfo);
        
        this._internals._filterSystem._updateWidgetInstanceFilterInfos(currentWidgetInstanceId, modelId, false, kpiId, ret);
        
        return ret;
    },
    
    evaluateGoal : function(widgetInstanceId, modelId, goalId){
        var currentWidgetInstanceId = widgetInstanceId;
        
        this._internals._filterSystem._updateWidgetInstanceFilterInfos(currentWidgetInstanceId, modelId, true, goalId, null);
        
        var _calculateGoalRec = function(goalInfoObj){
            if(goalInfoObj.connectedAlgorithm == null)
                if(goalInfoObj.connectedAlgorithm.code == null || goalInfoObj.connectedAlgorithm.code == '' || goalInfoObj.connectedAlgorithm.code.indexOf('return ') === -1)
                    throw 'The algorithm with id ' + goalInfoObj.connectedAlgorithm.id + ' must provide a javascript code with a return statement in the end';
                
            var requiredKpiValueList = [];
            
            goalInfoObj.requiredKpiList.forEach(function(requiredKpiInfo){
                requiredKpiValueList.push({
                    id : requiredKpiInfo.id,
                    name : requiredKpiInfo.name,
                    description : requiredKpiInfo.description,
                    fields :  requiredKpiInfo.fields,
                    value : this.evaluateKpi(widgetInstanceId, modelId, requiredKpiInfo.id)
                });
                
            }.bind(this));
            
            var requiredGoalList = [];
            
            goalInfoObj.requiredGoalList.forEach(function(requiredGoalInfo){
                requiredGoalList.push({
                    id : requiredGoalInfo.id,
                    name : requiredGoalInfo.name,
                    description : requiredGoalInfo.description,
                    value : _calculateGoalRec(requiredGoalInfo)
                });
                
            }.bind(this));
            
            var algF = new Function('requiredKpiValueList', 'requiredGoalValueList', goalInfoObj.connectedAlgorithm.code);
            
            var goalMeasure = null;
            try{
                requiredKpiValueList = Utils.clone(requiredKpiValueList);
                requiredGoalList = Utils.clone(requiredGoalList);
                goalMeasure = algF(requiredKpiValueList, requiredGoalList);
                if(goalMeasure == null)
                    throw 'The returned goal measure is null';
            }catch(e){
                throw 'Error generated in the algorithm for the goal with id ' + goalInfoObj.id + ' in the model ' + modelId + ':\n' + e;
            }

            if(typeof goalMeasure.status != 'number' && typeof goalMeasure.moreInfo != 'object')
                throw 'The goal measure have to contain at least the integer variable "status" and the object variable "moreInfo". Obtained:\n' + JSON.stringify(goalMeasure);
            
            return goalMeasure;
        }.bind(this);
        
        var goalInfo = ModelManager.getGoalInfo(modelId, goalId);
        
        var ret = _calculateGoalRec(goalInfo);
        
        this._internals._filterSystem._updateWidgetInstanceFilterInfos(currentWidgetInstanceId, modelId, true, goalId, ret);
        
        return ret;
    },
    
    events : {
        onFilterByValuesChange : function(handler){
            if(typeof handler != 'function')
                throw 'The provided handler must be a function';
            $('#dashboardDiv').on('filterByValuesChange', handler);
        },
        
        onFilterBySelectionClick : function(handler){
            if(typeof handler != 'function')
                throw 'The provided handler must be a function';
            $('#dashboardDiv').on('filterBySelectionClick', handler);
        }
    },
    
    _internals : {
        _initializeDashboardContent : function(){
            while(this._widgetSystem._widgetInstanceList.length != 0)
                this._widgetSystem._widgetInstanceList[0].panel.remove();
            
            var savedConfig = null;
            try{
                savedConfig = Dashboard._internals._importExportSystem._getSaveConfig();
            }catch(e){}
            if(savedConfig != null){
                if(savedConfig.dashboardConfig.datasourceUpdatingIntervall != null){
                    $('#updMinTxt').val(savedConfig.dashboardConfig.datasourceUpdatingIntervall);
                    $('#updMinTxt').trigger("change");
                }
                if(savedConfig.dashboardConfig.preferredLang != null)
                    Dashboard.preferredLang = savedConfig.dashboardConfig.preferredLang;
                if(savedConfig.dashboardStatus.kpiModel != null)
                    ModelManager.storeKpiModel(savedConfig.dashboardStatus.kpiModel);
                if(savedConfig.dashboardStatus.widgetInstanceList != null){
                    savedConfig.dashboardStatus.widgetInstanceList.forEach(function(widgetInstance){
                        this._widgetSystem._widgetInstanceList.push(widgetInstance);
                        this._widgetSystem._initWidgetContent(widgetInstance);
                        this._gridSystem._addElementToTheGrid(widgetInstance.panel.node, widgetInstance.size.w, widgetInstance.size.h, widgetInstance.position.x, widgetInstance.position.y);
                    }.bind(this));
                }
            }
        },
        
        _widgetSystem : {
            _widgetList : [],
            _widgetInstanceList : [],
            
            _instanciateWidget : function(widgetId){
                var widgetInstance = {          
                    id : Utils.generateUUID(),
                    widgetId : widgetId,
                    widgetConfig : null,
                    userInputList : {},
                    position : {
                        x : null,
                        y : null
                    },
                    size : {
                        w : null,
                        h : null
                    }
                };
                
                this._configureWidgetInstance(widgetInstance, function(){
                    this._widgetInstanceList.push(widgetInstance);
                    this._initWidgetContent(widgetInstance);
                    Dashboard._internals._gridSystem._addElementToTheGrid(widgetInstance.panel.node, widgetInstance.size.w, widgetInstance.size.h, widgetInstance.position.x, widgetInstance.position.y);
                }.bind(this));
            },
            
            _configureWidgetInstance : function(widgetInstance, onSuccessCallback){
                var widget = this._findWidget(widgetInstance.widgetId);
                
                var widgetConfigDialog = this._createWidgetConfiguration(widget, widgetInstance.widgetConfig);

                Utils.createDialogBootstrap(widgetConfigDialog.nodeElement, 'Widget Configuration: ' + widget.getName(), function(){
                    /*
                     - when the return is false the modal dialog do not close
                     - when the return is true the modal dialog is closed and the second function is called
                     */
                    try{
                        var config = widgetConfigDialog.okHandler();
                        if(config == null)
                            throw 'Error: widget config is null';
                        var expectedWidgetConfig = widget.getConfiguration();
                        for(var key in config)
                            if(expectedWidgetConfig[key] == null ||  config[key].value == null ||  config[key].value == '')
                                throw 'Error: the returned widget configuration is different from the configuration expected';
                        
                        widgetInstance.widgetConfig = config;
                        widgetInstance.size.w = widget.getPreferredSize().w;
                        widgetInstance.size.h = widget.getPreferredSize().h;
                    }catch(e){
                        console.log('Widget "' + widget.getName() + '" configuration returned an error: ' + e);
                        $('<div class="alert alert-danger fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Error occurred:<br>'+e+'</div>')
                            .fadeTo(5000, 500)
                            /*.slideUp(500, function(){
                                $(this).remove();
                            })*/
                            .appendTo(widgetConfigDialog.nodeElement);
                        return false;
                    }
                    
                    return true;
                    
                }.bind(this), function(){
                    onSuccessCallback.call();
                }.bind(this));
            },
            
            _createWidgetConfiguration : function(widgetSelected, presetConfig){
                if(presetConfig != null && typeof presetConfig !== 'object')
                    throw 'Invalid presetConfig';
                
                var conf = null;
                if(typeof widgetSelected.createConfiguration === 'function')
                    conf = widgetSelected.createConfiguration(presetConfig);
                else
                    conf = this._autoCreateConfigurationFor(widgetSelected, presetConfig);
                
                if(typeof conf !== 'object' || typeof conf.nodeElement !== 'object' || typeof conf.okHandler !== 'function')
                    throw 'Invalid configuration for the widget ' + widgetSelected.getName();
                
                conf.nodeElement = $('<div>')
                    .append($('<div>', {text : widgetSelected.getDescriptionInLang()})
                        .addClass('panel panel-primary panel-body'))
                    .append(conf.nodeElement);
                
                return conf;
            },
            
            _autoCreateConfigurationFor : function(widgetSelected, presetConfig){
                //TODO
                return {
                    nodeElement : null,
                    okHandler : function(){}
                };
            },
            
            _initWidgetContent : function(widgetInstance){
                var widget = this._findWidget(widgetInstance.widgetId);
                var widgetIntancePanel = this._initWidgetIntancePanel(widgetInstance);
                
                try{
                    widget.createContent(widgetInstance.widgetConfig, widgetInstance.id);
                }catch(e){
                    console.log('Widget "' + widget.getName() + '" content pre-creation returned an error: ' + e);
                }
                
                widgetIntancePanel.refresh();
            },
            
            _findWidget : function(widgetId){
                var widget = null;
                for(var i=0;i<this._widgetList.length;i++)
                    if(this._widgetList[i].getId() === widgetId)
                        widget = this._widgetList[i];
                if(widget === null)
                    throw 'Impossible to find the widget with id ' + widgetId;
                return widget;
            },
            
            _initWidgetIntancePanel : function(widgetInstance){
                widgetInstance.panel = {
                    _bodyNode : $('<div class="panel-body">'),
                    node : $('<div class="panel panel-default">'),
                    
                    setDisabled : function(isDisabled){
                        if(isDisabled === true)
                            this.node.addClass('disabled');
                        else
                            this.node.removeClass('disabled');
                    },
                    
                    initPanel : function(){
                        
                        if(widgetInstance.userInputList == null)
                            widgetInstance.userInputList = {};
                        
                        var _userInputMenu = function(){
                            var requiredCachedDatasourceWithInputList = [];
                            Dashboard._internals._datasourceCacheSystem._datasourceDataCacheList.forEach(function(datasourceCached){
                                if(datasourceCached.usedByWidgetList.indexOf(widgetInstance.id) != -1)
                                    if(datasourceCached.userRequiredInputFieldList.length > 0)
                                        requiredCachedDatasourceWithInputList.push(datasourceCached);
                            });
                            if(requiredCachedDatasourceWithInputList.length == 0)
                                return null;
                            
                            var ulNode = $('<ul class="dropdown-menu dropdown-menu-left">');
                            requiredCachedDatasourceWithInputList.forEach(function(datasource){
                                datasource.userRequiredInputFieldList.forEach(function(item, index){
                                    
                                    var previousVal = widgetInstance.userInputList[widgetInstance.id+'-'+datasource.id+'-'+index];
                                    if(previousVal == null) 
                                        previousVal = '';

                                    ulNode.append(
                                        $('<li><a href="#">Insert the value for "' + item.value + '":<br> <input id="'+widgetInstance.id+'-'+datasource.id+'-'+index+'" type="text" class="form-control" value="' + previousVal + '" placeholder="' + item.value + '"></a></li>')
                                            .popover({
                                                placement : 'auto right',
                                                container : 'body',
                                                title : 'The Datasource "' + datasource.name + '" require a value for "' + item.value + '"',
                                                content : item.description,
                                                trigger : 'hover'
                                            })
                                            .change(function(){
                                                widgetInstance.userInputList[widgetInstance.id+'-'+datasource.id+'-'+index] = $('#'+widgetInstance.id+'-'+datasource.id+'-'+index).val();
                                            })
                                        )
                                        .append($('<li role="separator" class="divider"></li>'))
                                    ;
                                });
                            });
                            
                            var ret = $('<div class="btn-group" role="group">')
                                .on('show.bs.dropdown', function () {
                                    //this.node.addClass('dropdownmenu_fix');
                                    //fix for the visibility overflow (the menu is moved in the body on visualization).
                                    $('body').append(ulNode.css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: ret.offset().left,
                                        top: ret.offset().top + ret.outerHeight()
                                      }).detach());
                                }.bind(this))
                                .on('hide.bs.dropdown', function (e) {
                                    //this.node.removeClass('dropdownmenu_fix');
                                    //fix for the visibility overflow (the menu is moved back from the body on hide).
                                    ret.append(ulNode.css({
                                        position: false,
                                        display: false,
                                        left: false,
                                        right: false
                                      }).detach());
                                }.bind(this))
                                .append($('<button type="button" title="Specify Inputs" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="glyphicon glyphicon-pencil"></span><span class="caret"></span></button>'))
                                .append(
                                    ulNode.click(function(e){
                                        //fix for the menu moved on the body that cause it to be closed on every click
                                        e.stopPropagation();
                                        e.preventDefault();
                                    })
                                )
                            ;
                            
                            return ret;
                        }.call(this);
                        
                        this.node.empty();
                        
                        this.node.append(
                            $('<div class="panel-heading clearfix">').append(
                                $('<div class="btn-group pull-right">')
                                .append(_userInputMenu)
                                .append(
                                    $('<button title="Refresh" type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-refresh"></span></button>')
                                    .click(function(){
                                        this.refresh();
                                    }.bind(this))
                                )
                                .append(
                                    $('<button title="Configure" type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-wrench"></span></button>')
                                    .click(function(){
                                        this.reconfigure();
                                    }.bind(this))
                                )
                                .append(
                                    $('<button title="Remove" type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-trash"></span></button>')
                                    .click(function(){
                                        this.remove();
                                    }.bind(this))
                                )
                            )
                        )
                        .append(this._bodyNode)
                        ;
                    },
                    
                    setWidgetContent : function(widgetContent){
                        this._bodyNode.empty();
                        this._bodyNode.append(widgetContent);
                    },
                    
                    refresh : function(forceRefresh){
                        if(forceRefresh == null)
                            forceRefresh = true;
                        
                        this.initPanel();
                        
                        var requiredCachedDatasourceList = function(widgetInstanceId){
                            var ret = [];
                            Dashboard._internals._datasourceCacheSystem._datasourceDataCacheList.forEach(function(datasourceCached){
                                if(datasourceCached.usedByWidgetList.indexOf(widgetInstanceId) != -1)
                                    if(ret.indexOf(datasourceCached.id) == -1)
                                        ret.push(datasourceCached.id);
                            });
                            return ret;
                        }.call(this, widgetInstance.id);
                        
                        Dashboard._internals._datasourceCacheSystem._updateDatasourceCache(requiredCachedDatasourceList, function(){
                            var widget = Dashboard._internals._widgetSystem._findWidget(widgetInstance.widgetId);
                            
                            var widgetContent = null;
                            try{
                                widgetContent = widget.createContent(widgetInstance.widgetConfig, widgetInstance.id);
                                $('<div class="alert alert-success fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Widget updated successfully</div>')
                                    .fadeTo(3000, 500)
                                    .slideUp(500, function(){
                                        $(this).remove();
                                    })
                                    .appendTo(this.node);
                            }catch(e){
                                console.log('Widget "' + widgetInstance.widgetId + '" content refresh returned an error:\n' + e);
                                $('<div class="alert alert-danger fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Error occurred:<br>'+e+'</div>')
                                    .fadeTo(5000, 500)
                                    /*.slideUp(500, function(){
                                        $(this).remove();
                                    })*/
                                    .appendTo(this.node);
                            }
                            
                            this.setWidgetContent(widgetContent);
                        }.bind(this), function(error){
                            console.log('Widget "' + widgetInstance.widgetId + '" content refresh returned an error:\n' + error);
                            $('<div class="alert alert-danger fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Error occurred:<br>'+error+'</div>')
                                .fadeTo(5000, 500)
                                /*.slideUp(500, function(){
                                    $(this).remove();
                                })*/
                                .appendTo(this.node);
                        }.bind(this), forceRefresh, widgetInstance);
                    },
                    
                    reconfigure : function(){
                        Dashboard._internals._widgetSystem._configureWidgetInstance(widgetInstance, function(){
                            this.refresh();
                        }.bind(this));
                    },
                    
                    remove : function(){
                        //update the _datasourceDataCacheList
                        var datasourceCacheList = Dashboard._internals._datasourceCacheSystem._datasourceDataCacheList;
                        for(var i=0;i<datasourceCacheList.length;i++){
                            var index = datasourceCacheList[i].usedByWidgetList.indexOf(widgetInstance.id);
                            if(index != -1){
                                datasourceCacheList[i].usedByWidgetList.splice(index, 1);
                                if(datasourceCacheList[i].usedByWidgetList.length === 0){
                                    datasourceCacheList.splice(i, 1);
                                }
                                break;
                            }
                        }
                        
                        //update the _widgetInstanceList
                        var widgetInstanceList = Dashboard._internals._widgetSystem._widgetInstanceList;
                        for(var i=0;i<widgetInstanceList.length;i++){
                            if(widgetInstanceList[i].id === widgetInstance.id){
                                widgetInstanceList.splice(i, 1);
                                break;
                            }
                        }
                        
                        //update the dom
                        Dashboard._internals._gridSystem._removeElementFromTheGrid(this.node[0].parentElement);
                    }
                };
                
                return widgetInstance.panel;
            },
            
            _initializeWidgetList : function(callback){
                if (typeof callback !== 'function' && callback != null)
                    throw 'callback must be a function';
                var loadedWidgets = 0;
                for(var i=0;i<Dashboard.widgetFileToLoadList.length;i++){
                    Utils.loadScript('./js/widgets/' + Dashboard.widgetFileToLoadList[i] + '.js', function(){
                        loadedWidgets++;
                        if(loadedWidgets === Dashboard.widgetFileToLoadList.length)
                            callback.call();
                    }.bind(this));
                }
            },
            
            _initializeWidgetPalette : function(){
                for(var i=0;i<this._widgetList.length;i++){
                    var widget = this._widgetList[i];
                    $('#widgetList')
                        .append(
                            $('<li class="widgetPaletteElement">')
                                .attr('title', widget.getDescriptionInLang())
                                .append(
                                    $('<a href="#"><span class="'+widget.getIconClass()+'"></span> '+widget.getName()+'</a>')
                                        .click(function(id){
                                            Dashboard._internals._widgetSystem._instanciateWidget(id);
                                        }.bind(this, widget.getId()))
                                        .popover({
                                            placement : 'left',
                                            container : 'body',
                                            content : widget.getDescriptionInLang(),
                                            trigger : 'hover'
                                        })
                                )
                        )
                    ;
                }
            }
        },
        
        _datasourceCacheSystem : {
            _backgroudDatasourceUpdateIntervalId : null,
            _datasourceDataCacheList : [],
            
            _getCachedDatasource : function(widgetInstanceId, dataSourceId){
                for(var i=0;i<this._datasourceDataCacheList.length;i++)
                    if(this._datasourceDataCacheList[i].id === dataSourceId)
                        if(this._datasourceDataCacheList[i].userRequiredInputFieldList.length === 0 || (this._datasourceDataCacheList[i].userRequiredInputFieldList.length != 0 && this._datasourceDataCacheList[i].usedByWidgetList.indexOf(widgetInstanceId) != -1))
                            return this._datasourceDataCacheList[i];
                return null;
            },
            
            _updateCachedDatasourceList : function(widgetInstanceId, dataSource){
                var cachedDatasource = this._getCachedDatasource(widgetInstanceId, dataSource.id);
                if(cachedDatasource == null){
                    cachedDatasource = Utils.clone(dataSource);
                    cachedDatasource.lastUpdateTime = null;
                    cachedDatasource.lastObtainedValue = null;
                    cachedDatasource.usedByWidgetList = [];
                    
                    this._datasourceDataCacheList.push(cachedDatasource);
                }
                
                if(cachedDatasource.usedByWidgetList.indexOf(widgetInstanceId) === -1)
                    cachedDatasource.usedByWidgetList.push(widgetInstanceId);
            },
            
            _updateDatasourceCache : function(datasourceToUpdateIdList, callbackOnSuccess, callbackOnFailure, forceUpdate, widgetInstanceCaller){
                var _checkIfDateTimeRequireUpdate = function(dateTimeString){
                    if(dateTimeString == null)
                        return true;
                    var ret = Date.now() - (new Date(dateTimeString).getTime()) >= Dashboard.datasourceUpdatingIntervallInSeconds * 1000 ;
                    return ret;
                }.bind(this);
                
                var countUpdatedDatasource = 0;
                var cachedDatasourceToUpdateList = [];
                
                this._datasourceDataCacheList.forEach(function(cachedDatasource){
                    if(forceUpdate === true || cachedDatasource.lastObtainedValue == null || _checkIfDateTimeRequireUpdate(cachedDatasource.lastUpdateTime))
                        cachedDatasourceToUpdateList.push(cachedDatasource);
                });
                
                var totDatasourceToUpdate = cachedDatasourceToUpdateList.length;
                if(datasourceToUpdateIdList != null)
                    totDatasourceToUpdate = datasourceToUpdateIdList.length;
                
                if(totDatasourceToUpdate == 0)
                    callbackOnSuccess.call();
                
                cachedDatasourceToUpdateList.forEach(function(cachedDatasource){
                    if(datasourceToUpdateIdList == null || (datasourceToUpdateIdList != null && datasourceToUpdateIdList.indexOf(cachedDatasource.id) != -1 && cachedDatasource.usedByWidgetList.indexOf(widgetInstanceCaller.id) != -1 )){
                        var configOrig = cachedDatasource.moduleConfiguration;
                        var configFinal = Utils.clone(configOrig);

                        cachedDatasource.userRequiredInputFieldList.forEach(function(item, index){
                            var userVal = widgetInstanceCaller.userInputList[widgetInstanceCaller.id+'-'+cachedDatasource.id+'-'+index];
                            if(userVal == null)
                                userVal = '';
                            for(var configEntry in configFinal){
                                //configFinal[configEntry] = {};
                                configFinal[configEntry].value = configFinal[configEntry].value.replace(new RegExp(Utils.escapeRegExp(item.value), 'g'), userVal);
                            }
                        });
                        
                        Utils.callDatasource(cachedDatasource.moduleName, configFinal, function(data){
                            cachedDatasource.lastUpdateTime = new Date().toISOString();
                            cachedDatasource.lastObtainedValue = data;
                            
                            countUpdatedDatasource++;
                            if(countUpdatedDatasource === totDatasourceToUpdate)
                                if(typeof callbackOnSuccess === 'function')
                                    callbackOnSuccess.call();
                        }, callbackOnFailure);
                    }
                });
            },
            
            _startBackgroudDatasourceUpdate : function(callbackOnSuccess){  
                var _updateFunction = function(){
                    Dashboard._internals._widgetSystem._widgetInstanceList.forEach(function(widgetInstance){
                        widgetInstance.panel.refresh(false);
                    });
                    if(Dashboard.datasourceUpdatingIntervallInSeconds > 0)
                        this._backgroudDatasourceUpdateIntervalId = setTimeout(_updateFunction, Math.round(Dashboard.datasourceUpdatingIntervallInSeconds)*1000);
                }.bind(this);
                
                _updateFunction();
            },
            
            _stopBackgroudDatasourceUpdate : function(){
                clearTimeout(this._backgroudDatasourceUpdateIntervalId);
            }
        },
        
        _filterSystem : {
            _widgetInstancesFilterInfos : {},
            
            _initFilterMenu : function(){
                $('#filterByTreeModelsUl').empty();
                var kpiModel = null;
                try{
                    kpiModel = ModelManager.getKpiModel();
                }catch(e){}
                if(kpiModel == null)
                    return;
                
                var _createFilterMenu = function(){
                    
                    var _createFilterMenuRec = function(rootNode){
                        var liNode = $('<li'+(rootNode.nodes!=null?' class="dropdown-submenu"':'')+'>').append(
                            $('<a href="#"><span class="'+rootNode.icon+'"></span> '+rootNode.text+'</a>').append(function(){
                                if(rootNode.nodes==null)
                                    return null;
                                return $('<span class="glyphicon glyphicon-chevron-right"></span>').click(function(e){
                                    $(this).parent().next('ul').toggle();
                                    $(this).toggleClass('glyphicon-chevron-right');
                                    $(this).toggleClass('glyphicon-chevron-down');
                                    e.stopPropagation();
                                    e.preventDefault();
                                });
                            }()).click(function(){
                                Handlers.onFilterBySelectionClick(rootNode.model_id, rootNode.isAGoal, rootNode.object_id);
                            }).popover({
                                placement : 'auto left',
                                container : 'body',
                                html : true,
                                title : rootNode.text + ' description',
                                content : rootNode.description,
                                trigger : 'hover'
                            })
                        );
                        
                        if(rootNode.nodes!=null){
                            var ulNode = $('<ul class="dropdown-menu">');
                            liNode.append(ulNode);
                            rootNode.nodes.forEach(function(item){
                                ulNode.append(_createFilterMenuRec(item));
                            });
                        }
                        
                        return liNode;
                    };
                    
                    var rootJsonNode = ModelManager.buildModelTreeStructure();
                    return _createFilterMenuRec(rootJsonNode);
                };
                
                $('#filterByTreeModelsUl').append(
                    _createFilterMenu()
                ).prev().off('click').click(function(e){
                    $(this).next('ul').toggle();
                    $(this).find('span').toggleClass('glyphicon-chevron-right');
                    $(this).find('span').toggleClass('glyphicon-chevron-down');
                    e.stopPropagation();
                    e.preventDefault();
                });
            },
            
            _filterWidgetInstancesByValue : function(showSuccessGoal, showFailureGoal, showUnknownGoal, minKpiVal, sameKpiVal, maxKpiVal){
                Dashboard._internals._widgetSystem._widgetInstanceList.forEach(function(widgetInstance){
                    var widgetInstanceFilterInfo = this._widgetInstancesFilterInfos[widgetInstance.id];
                    var toVisualize = false;
                    if(widgetInstanceFilterInfo != null)
                        for(var usedGoal in widgetInstanceFilterInfo.usedGoals){
                            var lastMeasure = widgetInstanceFilterInfo.usedGoals[usedGoal].lastMeasure;
                            var lastValue = (lastMeasure!=null)?lastMeasure.status:null;
                            if(lastValue == null)
                                toVisualize = true;
                            else {
                                if((lastValue > 0) && showSuccessGoal)
                                    toVisualize = true;
                                if((lastValue < 0) && showFailureGoal)
                                    toVisualize = true;
                                if((lastValue == 0) && showUnknownGoal)
                                    toVisualize = true;
                            }
                        }
                    if(widgetInstanceFilterInfo == null || jQuery.isEmptyObject(widgetInstanceFilterInfo.usedGoals))
                        toVisualize = true;
                    
                    widgetInstance.panel.setDisabled(!toVisualize);
                }.bind(this));
                
                Dashboard._internals._widgetSystem._widgetInstanceList.forEach(function(widgetInstance){
                    var widgetInstanceFilterInfo = this._widgetInstancesFilterInfos[widgetInstance.id];
                    var toVisualize = false;

                    if(widgetInstanceFilterInfo != null)
                        for(var usedkpi in widgetInstanceFilterInfo.usedKpis){
                            var lastMeasure = widgetInstanceFilterInfo.usedKpis[usedkpi].lastMeasure;
                            var lastValue = (lastMeasure!=null)?lastMeasure.data[0][lastMeasure.columns[0]]:null;
                            if(lastValue == null){
                                toVisualize = true;
                            }else{
                                if(minKpiVal != '' && (lastValue > minKpiVal))
                                    toVisualize = true;
                                if(sameKpiVal != '' && (lastValue == sameKpiVal))
                                    toVisualize = true;
                                if(maxKpiVal != '' && (lastValue < maxKpiVal))
                                    toVisualize = true;
                            }
                        }
                    if(widgetInstanceFilterInfo == null || (minKpiVal == '' && sameKpiVal == '' && maxKpiVal == ''))
                        toVisualize = true;
                    
                    widgetInstance.panel.setDisabled(!toVisualize);
                }.bind(this));
            },
            
            _filterWidgetInstancesBySelection : function(modelId, isGoal, objectId){
                Dashboard._internals._widgetSystem._widgetInstanceList.forEach(function(widgetInstance){
                    var widgetInstanceFilterInfo = this._widgetInstancesFilterInfos[widgetInstance.id];
                    var toVisualize = false;
                    
                    if(modelId == null || widgetInstanceFilterInfo == null)
                        toVisualize = true;
                    else {
                        if(widgetInstanceFilterInfo.usedModels.indexOf(modelId) == -1)
                            toVisualize = false;
                        else {
                            if(objectId == null){
                                if(isGoal && !jQuery.isEmptyObject(widgetInstanceFilterInfo.usedGoals))
                                    toVisualize = true;
                                if(!isGoal && !jQuery.isEmptyObject(widgetInstanceFilterInfo.usedKpis))
                                    toVisualize = true;
                            } else {
                                if(isGoal && widgetInstanceFilterInfo.usedGoals[objectId] != null)
                                    toVisualize = true;
                                if(!isGoal && widgetInstanceFilterInfo.usedKpis[objectId] != null)
                                    toVisualize = true;
                            }
                        }
                    }
                    
                    if(widgetInstanceFilterInfo == null || (widgetInstanceFilterInfo.usedModels.length == 0 && jQuery.isEmptyObject(widgetInstanceFilterInfo.usedKpis) && jQuery.isEmptyObject(widgetInstanceFilterInfo.usedGoals)))
                        toVisualize = true;
                    
                    widgetInstance.panel.setDisabled(!toVisualize);
                }.bind(this));
            },
            
            _updateWidgetInstanceFilterInfos : function(widgetInstanceId, modelId, isAGoal, objectId, lastMeasure){
                var currentWidgetInstanceFilterInfos = this._widgetInstancesFilterInfos[widgetInstanceId];
                if(currentWidgetInstanceFilterInfos == null){
                    currentWidgetInstanceFilterInfos = {
                        usedModels : [],
                        usedKpis : {},
                        usedGoals : {}
                    };
                    this._widgetInstancesFilterInfos[widgetInstanceId] = currentWidgetInstanceFilterInfos;
                }
                if(currentWidgetInstanceFilterInfos.usedModels.indexOf(modelId)===-1)
                    currentWidgetInstanceFilterInfos.usedModels.push(modelId);
                if(isAGoal){
                    if(currentWidgetInstanceFilterInfos.usedGoals[objectId]==null)
                        currentWidgetInstanceFilterInfos.usedGoals[objectId] = { lastMeasure : lastMeasure };
                } else {
                    if(currentWidgetInstanceFilterInfos.usedKpis[objectId]==null)
                        currentWidgetInstanceFilterInfos.usedKpis[objectId] = { lastMeasure : lastMeasure };
                }
            }
        },
        
        _gridSystem : {
            _dashboardGrid : null,
            
            _initializeDashboardGrid : function(){
                var options = {
                    float: false,
                    handle: '.grid-stack-item-content',
                    itemClass: 'grid-stack-item',
                    acceptWidgets: '.grid-stack-item'
                };
                var dashboardDiv = $('#dashboardDiv').addClass('grid-stack');
                dashboardDiv.gridstack(options);
                this._dashboardGrid = dashboardDiv.data('gridstack');
            },
            
            _addElementToTheGrid : function(element, width, height, x, y){
                var elToAdd = $('<div class="grid-stack-item">')
                    .append(
                        element
                            .addClass('grid-stack-item-content')
                    )
                ;
                var autoPosition = (x == null || y == null);
                                   
                this._dashboardGrid.addWidget(elToAdd, x, y, width, height, autoPosition);
            },
            
            _removeElementFromTheGrid : function(element){
                this._dashboardGrid.removeWidget(element);
            },
            
            _getGridElementPositionAndSize : function(node){
                var gridNode = $(node);
                var data = gridNode.data('_gridstack_node');
                
                return {
                    size : {
                        w : data.width,
                        h : data.height
                    },
                    position : {
                        x : data.x,
                        y : data.y
                    }
                };
            }
        },
        
        _importExportSystem : {
            _exportConfig : function(){
                return {
                    exportTime : new Date().toISOString(),
                    dashboardConfig : {
                        datasourceUpdatingIntervall : $('#updMinTxt').val(),
                        preferredLang : Dashboard.preferredLang
                    },
                    dashboardStatus : {
                        kpiModel : ModelManager.getKpiModel(),
                        widgetInstanceList : function(){
                            var ret = [];
                            Dashboard._internals._widgetSystem._widgetInstanceList.forEach(function(widgetInstance){
                                var instance = Object.assign({}, widgetInstance);
                                var gridNodePositionAndSize = Dashboard._internals._gridSystem._getGridElementPositionAndSize(instance.panel.node[0].parentNode);
                                instance.position.x = gridNodePositionAndSize.position.x;
                                instance.position.y = gridNodePositionAndSize.position.y;
                                instance.size.w = gridNodePositionAndSize.size.w;
                                instance.size.h = gridNodePositionAndSize.size.h;
                                delete instance.panel;
                                ret.push(instance);
                            }.bind(this));
                            return ret;
                        }.call(this)
                    }
                };
            },

            _importConfig : function(config){
                localStorage.setItem('adoxxDashboardConfig', JSON.stringify(config));
                Dashboard._internals._initializeDashboardContent();
            },
            
            _localSaveConfig : function(){
                localStorage.setItem('adoxxDashboardConfig', JSON.stringify(this._exportConfig()));
            },
            
            _getSaveConfig : function(){
                if(localStorage.adoxxDashboardConfig == null)
                    throw 'dashboard configuration not present';
                return JSON.parse(localStorage.adoxxDashboardConfig);
            },
            
            _isLocallySaved : function(){
                return localStorage.adoxxDashboardConfig != null;
            },
            
            _localUnsaveConfig : function(){
                localStorage.removeItem('adoxxDashboardConfig');
            }
        }
    }
    
};


var ModelManager = {
    storeKpiModel : function (model) {
        try{
            this._internals._processKpiModel(Utils.clone(model));
            localStorage.setItem('adoxxDashboardKpiModel', JSON.stringify(model));
        }catch(e){
            console.log('Error processing the model: ' + e);
            $('<div class="alert alert-danger fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Error processing the model:'+e+'</div>')
                .fadeTo(5000, 500)
                /*.slideUp(500, function(){
                    $(this).remove();
                })*/
                .appendTo($('#dashboardDiv'));
        }
    },
    
    removeKpiModel : function () {
        localStorage.removeItem('adoxxDashboardKpiModel');
    },
                    
    getKpiModel : function(){
        if(this._internals._kpiModel == null){
            if(localStorage.adoxxDashboardKpiModel == null)
                throw 'kpi model not present';
            this._internals._kpiModel = JSON.parse(localStorage.adoxxDashboardKpiModel);
            this._internals._processKpiModel(this._internals._kpiModel);
        }
        return this._internals._kpiModel;
    },
    
    isKpiModelOk : function(){
        if(localStorage.adoxxDashboardKpiModel == null)
            return false;
        return Utils.isValidJson(localStorage.adoxxDashboardKpiModel);
    },
    
    getKpiModelList : function(){
        var ret = [];
        this.getKpiModel().modelList.forEach(function(item, index, arr){
            ret.push({
                id : item.id,
                name : item.name,
                description : item.description
            });
        }, this);
        return ret;
    },
    
    getKpiList : function(modelId){
        var ret = [];
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId)
                modelItem.kpiList.forEach(function(kpiItem, kpiIndex, kpiArr){
                    ret.push({
                        id : kpiItem.id,
                        name : kpiItem.name,
                        description : kpiItem.description,
                        fields : Utils.clone(kpiItem.fields)
                    });
                }, this);
        }, this);
        return ret;
    },
    
    getTopLevelKpiList : function(modelId){
        var ret = [];
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId){
                
                var referencedKpiIdList = [];
                
                modelItem.kpiList.forEach(function(kpiItem, kpiIndex, kpiArr){
                    kpiItem.requiredKpiIdList.forEach(function(requiredKpiIdItem){
                        referencedKpiIdList.push(requiredKpiIdItem);
                    });
                }, this);
                
                modelItem.kpiList.forEach(function(kpiItem, kpiIndex, kpiArr){
                    if(referencedKpiIdList.indexOf(kpiItem.id) === -1)
                        
                        ret.push({
                            id : kpiItem.id,
                            name : kpiItem.name,
                            description : kpiItem.description,
                            fields : Utils.clone(kpiItem.fields)
                        });
                        
                }, this);
            }
        }, this);
        return ret;
    },
    
    getGoalList : function(modelId){
        var ret = [];
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId)
                modelItem.goalList.forEach(function(goalItem, goalIndex, goalArr){
                    ret.push({
                        id : goalItem.id,
                        name : goalItem.name,
                        description : goalItem.description
                    });
                }, this);
        }, this);
        return ret;
    },
    
    getTopLevelGoalList : function(modelId){
        var ret = [];
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId){
                
                var referencedGoalIdList = [];
                
                modelItem.goalList.forEach(function(goalItem, goalIndex, goalArr){
                    goalItem.requiredGoalIdList.forEach(function(requiredGoalIdItem){
                        referencedGoalIdList.push(requiredGoalIdItem);
                    });
                }, this);
                
                modelItem.goalList.forEach(function(goalItem, goalIndex, goalArr){
                    if(referencedGoalIdList.indexOf(goalItem.id) === -1)
                        ret.push({
                            id : goalItem.id,
                            name : goalItem.name,
                            description : goalItem.description
                        });
                }, this);
            }
        }, this);
        return ret;
    },
    
    getTopLevelElementList : function(modelId){
        var ret = [];
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId){
                
                var referencedGoalIdList = [];
                var referencedKpiIdList = [];
                
                modelItem.goalList.forEach(function(goalItem, goalIndex, goalArr){
                    goalItem.requiredGoalIdList.forEach(function(requiredGoalIdItem){
                        referencedGoalIdList.push(requiredGoalIdItem);
                    });
                    goalItem.requiredKpiIdList.forEach(function(requiredKpiIdItem){
                        referencedKpiIdList.push(requiredKpiIdItem);
                    });
                }, this);
                
                modelItem.kpiList.forEach(function(kpiItem, kpiIndex, kpiArr){
                    kpiItem.requiredKpiIdList.forEach(function(requiredKpiIdItem){
                        referencedKpiIdList.push(requiredKpiIdItem);
                    });
                }, this);
                
                modelItem.goalList.forEach(function(goalItem, goalIndex, goalArr){
                    if(referencedGoalIdList.indexOf(goalItem.id) === -1)
                        ret.push({
                            id : goalItem.id,
                            name : goalItem.name,
                            description : goalItem.description,
                            isAGoal : true
                        });
                }, this);
                
                modelItem.kpiList.forEach(function(kpiItem, kpiIndex, kpiArr){
                    if(referencedKpiIdList.indexOf(kpiItem.id) === -1)
                        ret.push({
                            id : kpiItem.id,
                            name : kpiItem.name,
                            description : kpiItem.description,
                            fields : Utils.clone(kpiItem.fields),
                            isAGoal : false
                        });
                }, this);
            }
        }, this);
        return ret;
    },
    
    getKpiInfo : function(modelId, kpiId){
        var model = null;
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId)
                model = modelItem;
        }, this);
        if(model === null)
            throw 'Impossible to find a model with id ' + modelId;
        
        var ret  = null;
        model.kpiList.forEach(function(kpiItem, kpiIndex, kpiArr){
            if(kpiItem.id === kpiId)
                ret = kpiItem;
        });
        if(ret == null)
            throw 'Impossible to find a kpi with id ' + kpiId + ' in the model ' + modelId;
        
        return ret;
    },
    
    getGoalInfo : function(modelId, goalId){
        var model = null;
        this.getKpiModel().modelList.forEach(function(modelItem, modelIndex, modelArr){
            if(modelItem.id === modelId)
                model = modelItem;
        }, this);
        if(model === null)
            throw 'Impossible to find a model with id ' + modelId;
        
        var ret  = null;
        model.goalList.forEach(function(goalItem, goalIndex, goalArr){
            if(goalItem.id === goalId)
                ret = goalItem;
        });
        if(ret == null)
            throw 'Impossible to find a goal with id ' + goalId + ' in the model ' + modelId;
        
        return ret;
    },
    
    buildModelTreeStructure : function(){
        var rootNode = {
            text : 'MODELs',
            levelId : '0',
            description : 'All the Models',
            icon : 'glyphicon glyphicon-folder-close',
            selectedIcon : 'glyphicon glyphicon-folder-open',
            nodes: []
        };
        this.getKpiModelList().forEach(function(modelInfo, modelIndex){
            var modelNodeJson = {
                text : modelInfo.name,
                levelId : '0-'+modelIndex,
                description : modelInfo.description,
                model_id : modelInfo.id,
                icon : 'glyphicon glyphicon-folder-close',
                selectedIcon : 'glyphicon glyphicon-folder-open',
                nodes: []
            };
            rootNode.nodes.push(modelNodeJson);
            var goalNodeJson = {
                text : 'GOALs',
                levelId : '0-'+modelIndex+'-0',
                description : 'All the Goals',
                model_id : modelInfo.id,
                isAGoal : true,
                icon : 'glyphicon glyphicon-record',
                nodes: []
            };
            var kpiNodeJson = {
                text : 'KPIs',
                levelId : '0-'+modelIndex+'-1',
                description : 'All the KPIs',
                model_id : modelInfo.id,
                isAGoal : false,
                icon : 'glyphicon glyphicon-align-left',
                nodes: []
            };
            modelNodeJson.nodes.push(goalNodeJson);
            modelNodeJson.nodes.push(kpiNodeJson);
            
            var _constructJsonRec = function(jsonRootEl, kpiOrGoalInfo, isAGoal, levelIndex){
                var jsonNode = {
                    text : kpiOrGoalInfo.name,
                    levelId : jsonRootEl.levelId + '-' + levelIndex,
                    description : kpiOrGoalInfo.description,
                    model_id : modelInfo.id,
                    object_id : kpiOrGoalInfo.id,
                    isAGoal : isAGoal,
                    icon : (!isAGoal)?'glyphicon glyphicon-align-left':'glyphicon glyphicon-record',
                    nodes: []
                };
                jsonRootEl.nodes.push(jsonNode);
                
                kpiOrGoalInfo.requiredKpiList.forEach(function(requiredKpiInfo, index){
                    _constructJsonRec(jsonNode, requiredKpiInfo, false, index);
                });
                if(isAGoal)
                    kpiOrGoalInfo.requiredGoalList.forEach(function(requiredGoalInfo, index){
                        _constructJsonRec(jsonNode, requiredGoalInfo, true, index);
                    });
                
                if(kpiOrGoalInfo.requiredKpiList.length == 0 && (!isAGoal || (isAGoal && kpiOrGoalInfo.requiredGoalList.length == 0)))
                    delete jsonNode.nodes;
            };
            
            this.getTopLevelElementList(modelInfo.id).forEach(function(item, itemIndex){
                if(item.isAGoal){
                    var goalInfo = this.getGoalInfo(modelInfo.id, item.id);
                    _constructJsonRec(goalNodeJson, goalInfo, true, itemIndex);
                }else{
                    var kpiInfo = this.getKpiInfo(modelInfo.id, item.id);
                    _constructJsonRec(kpiNodeJson, kpiInfo, false, itemIndex);
                }
            }, this);
            
            if(kpiNodeJson.nodes.length == 0)
                delete kpiNodeJson.nodes;
            if(goalNodeJson.nodes.length == 0)
                delete goalNodeJson.nodes;

        }, this);
        
        return rootNode;
    },
    
    _internals : {
        _kpiModel : null,
        
        _processKpiModel : function(kpiModel){
            var _findDataSource = function(id, model){
                if(id == null || id == '')
                    return null;
                for(var i=0;i<model.dataSourceList.length;i++)
                    if(model.dataSourceList[i].id === id)
                        return model.dataSourceList[i];
                throw 'Impossible to find the datasource with id ' + id;
            };
            
            var _findAlgorithm = function(id, model){
                if(id == null || id == '')
                    return null;
                for(var i=0;i<model.algorithmList.length;i++)
                    if(model.algorithmList[i].id === id)
                        return model.algorithmList[i];
                throw 'Impossible to find the algorithm with id ' + id;
            };
            
            var _findKpi = function(id, model){
                if(id == null || id == '')
                    return null;
                for(var i=0;i<model.kpiList.length;i++)
                    if(model.kpiList[i].id === id)
                        return model.kpiList[i];
                throw 'Impossible to find the kpi with id ' + id;
            };
            
            var _findGoal = function(id, model){
                if(id == null || id == '')
                    return null;
                for(var i=0;i<model.goalList.length;i++)
                    if(model.goalList[i].id === id)
                        return model.goalList[i];
                throw 'Impossible to find the goal with id ' + id;
            };
            
            var _processKpi = function(kpiItem, modelItem){

                kpiItem.getFieldInfos = function(fieldName){
                    for(var i=0;i<this.fields.length;i++)
                        if(this.fields[i].name == fieldName)
                            return this.fields[i];
                    throw 'Impossible to find a field with name: ' + fieldName + ' in the kpi ' + this.name;
                };
                
                kpiItem.connectedAlgorithm = _findAlgorithm(kpiItem.connectedAlgorithmId, modelItem);
                kpiItem.connectedDataSource = _findDataSource(kpiItem.connectedDataSourceId, modelItem);
                
                if(kpiItem.connectedDataSource == null && kpiItem.connectedAlgorithm == null)
                    throw 'The kpi with id ' + kpiItem.id + ' in the model ' + modelItem.id + ' can not have both DataSource and Algorithm null';
                if(kpiItem.connectedDataSource != null && kpiItem.connectedDataSource.structuredOutput == false && kpiItem.connectedAlgorithm == null)
                    throw 'The kpi with id ' + kpiItem.id + ' in the model ' + modelItem.id + ' require an algorithm to process the unstructured output of the datasource';
                
                if(kpiItem.connectedAlgorithm != null)
                    if(kpiItem.connectedAlgorithm.code == '' || kpiItem.connectedAlgorithm.code.indexOf('return ') === -1)
                        throw 'The algorithm with id ' + kpiItem.connectedAlgorithm.id + ' must provide a javascript code with a return statement in the end';
                
                kpiItem.requiredKpiList = [];
                for(var i=0;i<kpiItem.requiredKpiIdList.length;i++)
                    kpiItem.requiredKpiList.push(_findKpi(kpiItem.requiredKpiIdList[i], modelItem));
            };
            
            var _processGoal = function(goalItem, modelItem){

                goalItem.connectedAlgorithm = _findAlgorithm(goalItem.connectedAlgorithmId, modelItem);
                
                if(goalItem.connectedAlgorithm == null)
                    throw 'The goal with id ' + goalItem.id + ' in the model ' + modelItem.id + ' can not have the Algorithm null';
                if(goalItem.connectedAlgorithm.code == '' || goalItem.connectedAlgorithm.code.indexOf('return ') === -1)
                    throw 'The algorithm with id ' + goalItem.connectedAlgorithm.id + ' must provide a javascript code with a return statement in the end';
                
                goalItem.requiredKpiList = [];
                for(var i=0;i<goalItem.requiredKpiIdList.length;i++)
                    goalItem.requiredKpiList.push(_findKpi(goalItem.requiredKpiIdList[i], modelItem));
                goalItem.requiredGoalList = [];
                for(var i=0;i<goalItem.requiredGoalIdList.length;i++)
                    goalItem.requiredGoalList.push(_findGoal(goalItem.requiredGoalIdList[i], modelItem));
            };
            
            var _processModel = function(modelItem){
                
                modelItem.kpiList.forEach(function(kpiItem){
                    _processKpi(kpiItem, modelItem);
                });
                
                modelItem.goalList.forEach(function(goalItem){
                    _processGoal(goalItem, modelItem);
                });
            };
            
            var _checkLoops = function(modelItem){
                var _checkKpiRec = function(kpiItem, parentsArray){
                    for(var i=0;i<parentsArray.length;i++)
                        if(parentsArray[i] === kpiItem.id)
                            throw 'Error: in the model is present a dependency loop involving the kpi ' + kpiItem.id;
                    parentsArray.push(kpiItem.id);
                    kpiItem.requiredKpiList.forEach(function(item){
                        _checkKpiRec(item, parentsArray);
                    });
                };
                var _checkGoalRec = function(goalItem, parentsArray){
                    for(var i=0;i<parentsArray.length;i++)
                        if(parentsArray[i] === goalItem.id)
                            throw 'Error: in the model is present a dependency loop involving the goal ' + goalItem.id;
                    parentsArray.push(goalItem.id);
                    goalItem.requiredKpiList.forEach(function(item){
                        _checkKpiRec(item, []);
                    });
                    goalItem.requiredGoalList.forEach(function(item){
                        _checkGoalRec(item, parentsArray);
                    });
                };
                modelItem.kpiList.forEach(function(kpiItem){
                    _checkKpiRec(kpiItem, []);
                });
                modelItem.goalList.forEach(function(goalItem){
                    _checkGoalRec(goalItem, []);
                });
            };
            
            kpiModel.modelList.forEach(function(modelItem){
                _processModel(modelItem);
                _checkLoops(modelItem);
            });
        }
    }
};


var Utils = {
    getURLParameter : function(sParam){
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam)
                return sParameterName[1];
        }
        return null;
    },
    
    getHost : function(){
        var ret = ((window.location.protocol == '')?'http:':window.location.protocol) + '//' + ((window.location.hostname == '')?'127.0.0.1':window.location.hostname) + ':' + ((window.location.port == '')?'8080':window.location.port);
        return ret;
    },
    
    isValidJson : function(str){
        try{
            JSON.parse(str);
            return true;
        }catch(e){
            return false;
        }
    },
    
    loadScript : function(src, callback){
        var scriptEl = document.createElement('script');
        scriptEl.setAttribute('src', src);
        scriptEl.onload = callback;
        document.head.appendChild(scriptEl);
    },
    
    generateUUID : function() {
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function')
            d += performance.now(); //use high-precision timer if available
        
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },
    
    createDialogBootstrap : function(content, title, okCallback, onSuccessCallback){
        var modalDiv = document.createElement('div');
        $(modalDiv)
            .prependTo('#dashboardDiv')
            .addClass('modal')
            .addClass('fade')
            .addClass('modal-dialog')
            .addClass('modal-content')
            .append(
                $('<div class="modal-header">')
                    .append(
                        $('<button title="Close" type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>')
                    )
                    .append(
                        $('<h4 class="modal-title">' + title + '</h4>')
                    )
            )
            .append(
                $('<div class="modal-body">')
                    .append(content)
            )
            .append(
                $('<div class="modal-footer">')
                    .append(
                        $('<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>')
                    )
                    .append(
                        $('<button type="button" class="btn btn-primary">Continue</button>')
                            .click(function(){
                                var ok = false;
                                if(okCallback != null && typeof okCallback === 'function')
                                    ok = okCallback.call();
                                if(ok === true){
                                    $(modalDiv).modal('hide');
                                    onSuccessCallback.call();
                                }
                            })
                    )
            )
            .on('hidden.bs.modal', function () {
                modalDiv.outerHTML = '';
                //delete modalDiv;
            })
            .modal('show')
        ;
    },
    
    callDatasource : function(moduleName, moduleConfiguration, successCallback, failureCallback){
        if(typeof moduleName !== 'string')
            throw 'moduleName must be a string';
        if(typeof moduleConfiguration !== 'object')
            throw 'moduleConfiguration must be a json object';
        if(typeof successCallback !== 'function')
            throw 'successCallback must be a function';
        
        $.ajax({
            type: "POST",
            url: './rest/datasourceWrapper/executeModule?moduleName='+moduleName,
            processData: false,
            contentType : 'application/json',
            data: JSON.stringify(moduleConfiguration),
            dataType : 'json',
            async: true,
            success : function(data, status){
                successCallback(data);
            },
            error : function(request, status, error) {
                failureCallback('Error contacting the datasourceWrapper: ' + status + ' ' + error + '\n\nmoduleName: ' + moduleName + '\nmoduleConfiguration: ' + JSON.stringify(moduleConfiguration));
            }
        });
    },
    
    download : function (data, filename, type) {
        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                    url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);  
            }, 0); 
        }
    },
    
    escapeRegExp : function(str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    },
    
    clone : function(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};


var Handlers = {
    onKpiModelFileInput : function(e){
        if (!(window.File && window.FileReader && window.FileList && window.Blob)){
            alert('The File APIs are not fully supported in this browser.');
            return;
        }
            
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var kpiModel = e.target.result;
            if(!Utils.isValidJson(kpiModel))
                throw 'The provided kpi model is not in a valid Json format';
            ModelManager.storeKpiModel(JSON.parse(kpiModel));
            $(document).trigger('updatedKpiModel');
        };
        reader.readAsText(file);
    },
        
    onMessageReceived : function(event) {
        var origin = event.origin || event.originalEvent.origin;
        var dashboardConfig = event.data;
        Dashboard._internals._importExportSystem._importConfig(dashboardConfig);

        $(document).trigger('updatedKpiModel');
    },
    
    onWidgetListInitialized : function(){
        Dashboard._internals._widgetSystem._initializeWidgetPalette();
        Dashboard._internals._gridSystem._initializeDashboardGrid();
        Dashboard._internals._initializeDashboardContent();
        $(document).trigger('updatedKpiModel');
    },

    onUpdateIntervallChange : function(){
        var updateMinutesInterval = Number($('#updMinTxt').val());
        if(isNaN(updateMinutesInterval)){
            updateMinutesInterval = -1;
            $('#updMinTxt').val('-1');
        }
        
        Dashboard.datasourceUpdatingIntervallInSeconds = updateMinutesInterval * 60;
        
        Dashboard._internals._datasourceCacheSystem._stopBackgroudDatasourceUpdate();
        Dashboard._internals._datasourceCacheSystem._startBackgroudDatasourceUpdate(Handlers.onDatasourceCacheUpdate);
    },
    
    onWidgetFilterChange : function(){
        var filter = $('#widgetFilterTxt').val().toLowerCase();
        $('#widgetList .widgetPaletteElement').each(function(index, item){
            var itemJ = $(item);
            if(filter === '')
                itemJ.show();
            else
                if(itemJ.text().toLowerCase().indexOf(filter) != -1)
                    itemJ.show();
                else
                    if(itemJ.attr('title').toLowerCase().indexOf(filter) != -1)
                        itemJ.show();
                    else
                        itemJ.hide();
        });
    },
    
    onConfigMenuShowed : function(){
        $('#modelStatusDiv').removeClass();
        if(ModelManager.isKpiModelOk()){
            $('#modelStatusDiv')
                .addClass('glyphicon glyphicon-ok color_green')
                .attr('title', 'The KPI Model is present')
            ;
        }else{
            $('#modelStatusDiv')
                .addClass('glyphicon glyphicon-remove color_red')
                .attr('title', 'The KPI Model is not present')
            ;
        }
        $('#dashboardStatusDiv').removeClass();
        if(Dashboard._internals._importExportSystem._isLocallySaved()){
            $('#dashboardStatusDiv')
                .addClass('glyphicon glyphicon-ok color_green')
                .attr('title', 'The Dashboard status has been saved internally on ' + Dashboard._internals._importExportSystem._getSaveConfig().exportDateTime)
            ;
        }else{
            $('#dashboardStatusDiv')
                .addClass('glyphicon glyphicon-remove color_red')
                .attr('title', 'The Dashboard status is not saved internally')
            ;
        }
    },
    
    onRemoveModelClick : function(){
        ModelManager.removeKpiModel();
        $(document).trigger('updatedKpiModel');
    },
    
    onExportDashboardClick : function(){
        Utils.download(JSON.stringify(Dashboard._internals._importExportSystem._exportConfig()), 'dashboard_backup_' + new Date().toISOString() + '.json', 'application/json');
    },
    
    onDashboardInportFileInput : function(e){
        if (!(window.File && window.FileReader && window.FileList && window.Blob)){
            alert('The File APIs are not fully supported in this browser.');
            return;
        }
            
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var content = e.target.result;
            if(!Utils.isValidJson(content))
                throw 'The provided configuration is not in a valid Json format';
            Dashboard._internals._importExportSystem._importConfig(JSON.parse(content));
            $(document).trigger('updatedKpiModel');
        };
        reader.readAsText(file);
    },
    
    onSaveDashboardClick : function(){
        Dashboard._internals._importExportSystem._localSaveConfig();
    },
    
    onUnsaveDashboardClick : function(){
      Dashboard._internals._importExportSystem._localUnsaveConfig();
    },
    
    onFilterByValuesChange : function(){
        var showSuccessGoal = $('#filterGoalSuccessChk').is(':checked');
        var showFailureGoal = $('#filterGoalFailureChk').is(':checked');
        var showUnknownGoal = $('#filterGoalUnknownChk').is(':checked');
        var minKpiVal = $('#filterKPIGreaterTxt').val();
        var sameKpiVal = $('#filterKPIEqualTxt').val();
        var maxKpiVal = $('#filterKPILowerTxt').val();
        
        var event = jQuery.Event("filterByValuesChange");
        event.showSuccessGoal = showSuccessGoal;
        event.showFailureGoal = showFailureGoal;
        event.showUnknownGoal = showUnknownGoal;
        event.minKpiVal = minKpiVal;
        event.sameKpiVal = sameKpiVal;
        event.maxKpiVal = maxKpiVal;
        
        $('#dashboardDiv').trigger(event);
        
        Dashboard._internals._filterSystem._filterWidgetInstancesByValue(showSuccessGoal, showFailureGoal, showUnknownGoal, minKpiVal, sameKpiVal, maxKpiVal);
    },
    
    onFilterBySelectionClick : function(modelId, isGoal, objectId){
        console.log('modelId: ' + modelId + ' isGoal: ' + isGoal + ' objectId: ' + objectId);
        var event = jQuery.Event("filterBySelectionClick");
        event.modelId = modelId;
        event.isGoal = isGoal;
        event.objectId = objectId;
        
        $('#dashboardDiv').trigger(event);
        
        Dashboard._internals._filterSystem._filterWidgetInstancesBySelection(modelId, isGoal, objectId);
    },
    
    onUpdatedKpiModel : function(){
        Dashboard._internals._filterSystem._initFilterMenu();
    },
    
    onDocumentReady : function(){
        document.getElementById('kpiModelFileInput').addEventListener('change', Handlers.onKpiModelFileInput, false);
        document.getElementById('updMinTxt').addEventListener('change', Handlers.onUpdateIntervallChange, false);
        document.getElementById('widgetFilterTxt').addEventListener('keyup', Handlers.onWidgetFilterChange, false);
        document.getElementById('widgetFilterTxt').addEventListener('click', Handlers.onWidgetFilterChange, false);
        document.getElementById('widgetFilterTxt').addEventListener('change', Handlers.onWidgetFilterChange, false);
        $('#configDiv').on('show.bs.dropdown', Handlers.onConfigMenuShowed);
        document.getElementById('removeModelBtn').addEventListener('click', Handlers.onRemoveModelClick, false);
        document.getElementById('exportDashboardBtn').addEventListener('click', Handlers.onExportDashboardClick, false);
        document.getElementById('dashboardImportFileInput').addEventListener('change', Handlers.onDashboardInportFileInput, false);
        document.getElementById('saveDashboardBtn').addEventListener('click', Handlers.onSaveDashboardClick, false);
        document.getElementById('unsaveDashboardBtn').addEventListener('click', Handlers.onUnsaveDashboardClick, false);
        document.getElementById('filterGoalSuccessChk').addEventListener('change', Handlers.onFilterByValuesChange, false);
        document.getElementById('filterGoalFailureChk').addEventListener('change', Handlers.onFilterByValuesChange, false);
        document.getElementById('filterGoalUnknownChk').addEventListener('change', Handlers.onFilterByValuesChange, false);
        document.getElementById('filterKPIGreaterTxt').addEventListener('change', Handlers.onFilterByValuesChange, false);
        document.getElementById('filterKPIEqualTxt').addEventListener('change', Handlers.onFilterByValuesChange, false);
        document.getElementById('filterKPILowerTxt').addEventListener('change', Handlers.onFilterByValuesChange, false);
        $(document).on('updatedKpiModel', Handlers.onUpdatedKpiModel);
        
        $('#updMinTxt').val((Dashboard.datasourceUpdatingIntervallInSeconds/60));
        
        Dashboard.setLang(Utils.getURLParameter('lang'));
        Dashboard._internals._widgetSystem._initializeWidgetList(Handlers.onWidgetListInitialized);
        
        Dashboard._internals._datasourceCacheSystem._startBackgroudDatasourceUpdate();
    }
};