ADOxx KPI WEB DASHBOARD
====================

# Summary
The ADOxx KPI WEB DASHBOARD is a web component that give you the possibility to create a personalised dashboard for Key Performance Indicators and Goals defined in an appropriate model.
The project include data source wrapper available as REST service, used by the dashboard in order to retrieve data from several type of data sources (i.e. Excel, DB, Triplestore, etc.) through a simple JSON configuration in a standardised interface.

# Functionalities

- Model centric: the dashboard take from the model all the informations about KPIs and Goals with their respective calculation algorithms and data source configuration
- Drag&Drop interface: Widgets are movable in the Dashboard
- Easy integration with others modelers: message passing support through iFrame are provided and the KPI model and the KPI model is not in a proprietary format but in a simple JSON structure
- RealTime KPI and Goal evaluation
- Automatic refresh of KPI and Goal status
- Filtering capabilities
- Import/Export of the kpi model and dashboard status
- Extensible Widget list 
- Extensible data sources configuration
- Client centric: the dashboard is totally Javascript code except a server side REST service used only as a wrapper to contact the different data sources

more informations can be found in the [wiki](../../wiki)
