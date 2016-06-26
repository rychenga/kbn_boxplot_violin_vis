define(function (require) {
  return function boxplotViolinProvider(Private, Notifier) {
    var _ = require('lodash');
    var d3 = require('d3');

    var arrayToLinkedList = require('ui/agg_response/hierarchical/_array_to_linked_list');

    var notify = new Notifier({
      location: 'Boxplot Violin chart response converter'
    });

    var nodes = [];

    return function (vis, resp) {

      var metric = vis.aggs.bySchemaGroup.metrics[0];
      var children = vis.aggs.bySchemaGroup.buckets;
      children = arrayToLinkedList(children);

      var firstAgg = children[0];
      var aggData = resp.aggregations[firstAgg.id];

      var maxValue = 0;
      var minValue = 0;
      var boolFirst = true;

      nodes = [];

      var idAggregation = children[1].id;

      var labels = null;

      try {
        labels = JSON.parse(vis.params.jsonLabels); //[ { 'text' : 'CUENTA'} ]
      } catch (e) {
        labels = '';
      }

      var pos = 0;

      var aggs = [];
      _.each(aggData.buckets, function (d, i) {

        var results = [];
        var min = 0;
        var max = 0;

        if (d[idAggregation])
        {
          if (d[idAggregation].buckets) {

            var orderedResults = d[idAggregation].buckets.sort(d3.ascending);
            max = orderedResults[orderedResults.length - 1].key;
            min = orderedResults[0].key;

            _.each(d[idAggregation].buckets, function (d1, i1) {

              for (var t = 0; t < d1.doc_count; t++) {
                results.push(d1.key);
              }


            });

            if (boolFirst) {
              maxValue = max;
              minValue = min;
              boolFirst = false;
            }
            else {
              if (min < minValue) minValue = min;
              if (max > maxValue) maxValue = max;
            }
          }
        }

        var textLabel = d.key;

        if (labels.length > pos)
        {
          textLabel = (labels[pos].text ? labels[pos].text : textLabel);
        }

        nodes.push({ boxplotKey : d.key, textLabel : textLabel, results : results });

        pos++;
      });

      var chart = {
        maxValue : maxValue,
        minValue : minValue,
        data: nodes
      };

      return chart;
    };
  };
});
