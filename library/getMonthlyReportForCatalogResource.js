/**
 * Goal :
 * This action reports some statistics on a catalog resource requests.
 * By now, it counts only requests by month during the last 12 months.
 * It could be modified to do much more (add "by requestor" info for instance).
 *
 * Sample :
 * Package : fr.numaneo.library
 * Action : getMonthlyReportForCatalogResource
 * Input Parameters :
 *  - catalogResourceName (string) : Name of the catalog resource in vRA
 *  - businessGroupName (string)   : Name of the business group the catalog resource belongs to
 * Output Parameters : void
 *
 * Pre-requisite : Use of lodash Library (https://code.vmware.com/samples/4088/use-lodash.js-library-in-workflow-script?h=Sample)
 *
 * Script in Workflow use:
 *
 * System.getModule("fr.numaneo.library").getMonthlyReportForCatalogResource("My Xaas Catalog", "BG");
 *
 */

// Load Lodash functions
var _ = System.getModule("fr.numaneo.library").lodashLibrary();
var vcaccafeHost = Server.findAllForType("vCACCAFE:VCACHost")[0];

var filterLastYearItems = function(list) {
	var oneYearBeforeInMs = 365 * 24 * 60 * 60 * 1000;
	var dateOneYearInMs = (new Date().getTime() - oneYearBeforeInMs);

	var filteredList = _(list).filter(function(item) {
		try {
			if(item.getOrganization().getSubtenantLabel() === businessGroupName && item.state.value() === "SUCCESSFUL" && item.dateCompleted) {
				return ((item.dateCompleted.getTime() - dateOneYearInMs) > 0);
			}
			return false;
		} catch(e) {
			return false;
		}
	}).value();
	return filteredList;
};

var groupByYearMonth = function(list) {
	var groupByList = _.groupBy(list, function(item) {
		return item.dateCompleted.getFullYear() + "-" + _.padStart(item.dateCompleted.getMonth() + 1 + "", 2, "0");
	});

	var groupByKeys = _.keys(groupByList).sort();
	return _.transform(groupByKeys, function(result, key) {
		var value = _.transform(groupByList[key], function(requestIdList, ci) {
			requestIdList.push(ci.requestNumber);
		}, []);
		result[key] = _(value).compact().uniq().value().sort();
	}, {});
};

var sumByKey = function(list) {
	return _.transform(list, function(result, valueList, key) {
		result[key] = valueList.length;
	}, {});
};

var cisReq = vCACCAFEEntitiesFinder.findCatalogItemRequests(vcaccafeHost, catalogResourceName);

var createLastYear = filterLastYearItems(cisReq);
var createByYearMonth = groupByYearMonth(createLastYear);
var createCount = sumByKey(createByYearMonth);

System.debug("createByYearMonth :\n" + JSON.stringify(createByYearMonth, null, 2));

var arrayOfRequests = {};
arrayOfRequests["last12Month"] = createCount;

System.log("All counts by month for '" + catalogResourceName + "' (" + businessGroupName + ") :\n" + JSON.stringify(arrayOfRequests, null, 2));
