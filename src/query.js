'use strict';

var _ = require('underscore');
var moment = require('moment');

module.exports.frequency = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH'
};

module.exports.measures = {
  installs: 'installs',
  sessions: 'sessions',
  pageViews: 'pageViewCount',
  activeDevices: 'activeDevices',
  crashes: 'crashes',
  payingUsers: 'payingUsers',
  units: 'units',
  sales: 'sales'
};

module.exports.dimension = {
  campaigns: 'campaignId',
  websites: 'domainReferrer'
}

module.exports.queryType = {
  sources : 'sources',
  metrics : 'metrics'
}

function AnalyticsQuery(type, appId, config) {
  var fn = Query.prototype[type];
  if (typeof fn !== 'function') {
    throw new Error('Unknown query type: ' + type);
  }

  return new Query(appId, config)[type]();
}

AnalyticsQuery.metrics = function(appId, config) {
  return new Query(appId, config).metrics();
}

AnalyticsQuery.sources = function(appId, config) {
  return new Query(appId, config).sources();
}

var Query = function(appId, config) {
  this.config = {
    start: moment(),
    end: moment(),
    group: null,
    frequency: 'DAY',
    dimensionFilters: []
  };

  this.adamId = appId;
  this.apiURL = 'https://analytics.itunes.apple.com/analytics/api/v1';

  _.extend(this.config, config);

  // Private
  this._time = null;

  return this;
};

Query.prototype.metrics = function() {
  this.endpoint = '/data/time-series';
  delete this.config['limit']
  delete this.config['dimension']

  return this;
}

Query.prototype.sources = function() {
  this.endpoint = '/data/sources/list';
  this.config.limit = 100;
  this.config.dimension = 'domainReferrer';

  return this;
}

Query.prototype.date = function(start, end) {
	this.config.start = toMomentObject(start);
  end = (typeof end == 'undefined') ? start : end;
	this.config.end = toMomentObject(end);

	return this;
}

Query.prototype.time = function(value, unit){
  this._time = [value, unit];
  return this;
}

Query.prototype.limit = function(limit){
  this.config.limit = limit;
  return this;
}

Query.prototype.assembleBody = function() {
  this.config.start = toMomentObject(this.config.start);
  this.config.end = toMomentObject(this.config.end);

  if (this.config.end.diff(this.config.start, 'days') === 0 && _.isArray(this._time)) {
    this.config.start = this.config.start.subtract(this._time[0], this._time[1]);
  } else if (this.config.end.diff(this.config.start) < 0) {
    this.config.start = this.config.end;
  }

  var timestampFormat = 'YYYY-MM-DD[T00:00:000Z]';

  if (!_.isArray(this.config.measures)) {
    this.config.measures = [this.config.measures];
  }

  var body = {
    startTime: this.config.start.format(timestampFormat),
    endTime: this.config.end.format(timestampFormat),
    group: this.config.group,
    frequency: this.config.frequency,
    adamId: [
      this.adamId
    ],
    dimensionFilters: this.config.dimensionFilters,
    measures: this.config.measures
  };

  if (this.config.dimension !== 'undefined') {
    body.dimension = this.config.dimension;
  }

  if (this.config.limit !== 'undefined') {
    body.limit = this.config.limit;
  }

  return body;
};

module.exports.AnalyticsQuery = AnalyticsQuery;

function toMomentObject(date) {
  if (moment.isMoment(date))
		return date;

	if (date instanceof Date)
		return moment(date);

  var regex = new RegExp(/([0-9]{4})-([0-9]{2})-([0-9]{2})/);
	if(_.isString(date) && !!(date.match(regex)))
		return moment(date, "YYYY-MM-DD");

	throw new Error('Unknown date format. Please use Date() object or String() with format YYYY-MM-DD.');
}