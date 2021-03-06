class CJ4_FMC_DirectToPage {

    /**
     * 
     * @param {CJ4_FMC} fmc 
     * @param {*} directWaypoint 
     * @param {Number} wptsListIndex 
     */
    static ShowPage(fmc, directWaypoint, wptsListIndex = 0) {
        fmc.clearDisplay();
        let directWaypointCell = " ";
        if (directWaypoint) {
            directWaypointCell = directWaypoint.ident;
        }
        else if (fmc.flightPlanManager.getDirectToTarget()) {
            directWaypointCell = fmc.flightPlanManager.getDirectToTarget().ident;
        }
        let waypointsCell = ["", "", "", "", ""];
        let iMax = 5;
        fmc.onLeftInput[0] = () => {
            let value = fmc.inOut;
            fmc.fpHasChanged = true;
            fmc.clearUserInput();
            fmc.getOrSelectWaypointByIdent(value, (w) => {
                if (w) {
                    CJ4_FMC_DirectToPage.ShowPage(fmc, w, wptsListIndex);
                }
            });
        };
        let i = 0;

        //Get total count of waypoints, including arrival and approach waypoints
        let approachWaypointsCount = fmc.flightPlanManager.getApproachWaypoints().length;
        let waypointsCount = fmc.flightPlanManager.getWaypointsCount() + approachWaypointsCount;
        
        //temporary
        console.log("idx:" + fmc.flightPlanManager.getActiveWaypointIndex());
        console.log("wpts:" + fmc.flightPlanManager.getWaypointsCount());
        console.log("app:" + approachWaypointsCount);
        console.log("arr:" + fmc.flightPlanManager.getArrivalWaypointsCount());
        console.log("tot:" + waypointsCount);
        console.log("appidx:" + fmc.flightPlanManager.getApproachIndex());
        console.log("app loaded?:" + fmc.flightPlanManager.isLoadedApproach());
        console.log("app active?:" + fmc.flightPlanManager.isActiveApproach());        

        let waypoints = CJ4_FMC_DirectToPage.getAvailableWaypoints(fmc);
        while (i < waypoints.length && i + wptsListIndex < waypoints.length && i < iMax) {
            let waypoint = waypoints[i + wptsListIndex];
            if (waypoint) {
                waypointsCell[i] = "←" + waypoint.ident + "[color]blue";
                if (waypointsCell[i]) {
                    fmc.onLeftInput[i + 1] = () => {
                        fmc.fpHasChanged = true;
                        CJ4_FMC_DirectToPage.ShowPage(fmc, waypoint, wptsListIndex);
                    };
                }
            }
            else {
                waypointsCell[i] = "----";
            }
            i++;
        }
        if (i < iMax) {
            waypointsCell[i] = "--END--";
        }
        let activateLine = "";

        
        if (directWaypoint) {
            activateLine = "CANCEL DTO>";
            //fmc.onRightInput[5] = () => {
            //fmc.messageBox.innerHTML = "Working...";

            //added functionality to enable the ability to go direct to the IAF of the loaded approach

            let isApproachWaypoint = fmc.flightPlanManager.getApproachWaypoints().indexOf(directWaypoint) !== -1;

            fmc.onExecPage = () => {
                fmc.refreshPageCallback = () => {
                    fmc.messageBox.innerHTML = "";
                    fmc.fpHasChanged = false;
                    console.log("refreshcallback running -> legs page");
                    fmc.onLegs();
                };
                fmc.messageBox.innerHTML = "Working . . .";
                fmc._activatingDirectTo = true;
                console.log("_activatingDirectTo = true: " + fmc._activatingDirectTo);

                if (isApproachWaypoint && !fmc.flightPlanManager.isActiveApproach()) {
                    let removeWaypointForApproachMethod = (callback = EmptyCallback.Void) => {
                        let i = 1;
                        let destinationIndex = fmc.flightPlanManager.getWaypoints().findIndex(w => {
                            return w.icao === fmc.flightPlanManager.getDestination().icao;
                        });
    
                        if (i < destinationIndex) {
                            fmc.activateRoute();
                            fmc.flightPlanManager.removeWaypoint(1, i === destinationIndex, () => {
                                removeWaypointForApproachMethod(callback);
                            });
                        }
                        else {
                            callback();
                        }        
                    };
                    console.log("starting removeWaypointForApproachMethod")
                    removeWaypointForApproachMethod(() => {
                        console.log("removeWaypointForApproachMethod done");
                        fmc.flightPlanManager.tryAutoActivateApproach()
                        console.log("tryAutoActivateApproach done");
                        fmc.onExecDefault();
                    });                     
                }
                //DEFAULT CASE - if you are not on an approach and you are not trying to go direct to an approach waypoint,
                //execute the normal Direct To functionality
                else {
                    fmc.activateDirectToWaypoint(directWaypoint, () => {
                        fmc.flightPlanManager.setActiveWaypointIndex(1, () => {
                            fmc.activateRoute(() => {
                                fmc.onExecDefault();})
                        });
                    });
                }
            };
        }
        fmc.onRightInput[5] = () => {
            if (activateLine == "CANCEL DTO>") {
                if (directWaypoint) {
                    directWaypointCell = " ";
                    fmc.fpHasChanged = false;
                    fmc.messageBox.innerHTML = "";
                    CJ4_FMC_DirectToPage.ShowPage(fmc);
                }
            }
        };

        
        fmc.setTemplate([
            ["DIR TO[color]blue"],
            ["WAYPOINT", "DIST", "UTC"],
            ["[" + directWaypointCell + "][color]blue", "---", "----"],
            ["F-PLN WPTS"],
            [waypointsCell[0], "DIRECT TO[color]blue"],
            ["", "WITH"],
            [waypointsCell[1], "ABEAM PTS[color]blue"],
            ["", "RADIAL IN"],
            [waypointsCell[2], "[ ]°[color]blue"],
            ["", "RADIAL OUT"],
            [waypointsCell[3], "[ ]°[color]blue"],
            [""],
            [waypointsCell[4], activateLine]
        ]);
        fmc.onNextPage = () => {
            wptsListIndex++;
            wptsListIndex = Math.min(wptsListIndex, CJ4_FMC_DirectToPage.getAvailableWaypoints(fmc).length - 5);
            CJ4_FMC_DirectToPage.ShowPage(fmc, directWaypoint, wptsListIndex);
        };
        fmc.onPrevPage = () => {
            wptsListIndex--;
            wptsListIndex = Math.max(wptsListIndex, 0);
            CJ4_FMC_DirectToPage.ShowPage(fmc, directWaypoint, wptsListIndex);
        };
    }

    /**
     * Gets available direct-to waypoints from the flight plan manager.
     * @param {CJ4_FMC} fmc 
     */
    static getAvailableWaypoints(fmc) {
        let enrouteWaypoints = fmc.flightPlanManager.getWaypoints();
        let approachWaypoints = fmc.flightPlanManager.getApproachWaypoints();

        if (approachWaypoints.length > 0) {
            let approachWaypointsSliced = [...approachWaypoints.slice(0,2).filter(w => w.ident !== 'USER')];
            return [...enrouteWaypoints.slice(0, -1), ...approachWaypointsSliced.slice(0, 1), ...[enrouteWaypoints[enrouteWaypoints.length - 1]]]
                .filter(w => w.ident !== 'USER' && w.ident !== 'USR');
        }
        else {
            return [...enrouteWaypoints]
                .filter(w => w.ident !== 'USER' && w.ident !== 'USR');
        }  
    }
}
//# sourceMappingURL=CJ4_FMC_DirectToPage.js.map