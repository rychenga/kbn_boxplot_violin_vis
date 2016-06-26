define(function (require) {

  var module = require('ui/modules').get('kibana/kbn_boxplot_violin_vis', ['kibana']);

  var d3 = require('d3');
  var _ = require('lodash');
  var $ = require('jquery');

  module.controller('KbnBoxplotViolinVisController',
    function ($scope, $element, $rootScope, Private) {
      var boxplotViolinAggResponse = Private(require('./lib/agg_response'));

      var svgRoot = $element[0];
      var globalData = null;
      var margin = {
        top: 10,
        bottom: 30,
        left: 80,
        right: 10
      };

      var width = 600;
      var height = 400;
      var boxWidth = 30;

      var boxSpacing = 10;
      var domain = [-10, 10];
      var resolution = 20;
      var interpolation = 'basis'; //'step-before';
      var y = null;
      var yAxis = null;

      function addViolin(svg, results, height, width, domain, imposeMax, violinColor) {
        var data = d3.layout.histogram().bins(resolution).frequency(0)(results.results);

        var y = d3.scale.linear().range([width / 2, 0]).domain([0, Math.max(imposeMax, d3.max(data, function (d) {
          return d.y;
        }))]);

        var x = d3.scale.linear().range([height, 0]).domain(domain).nice();

        var area = d3.svg.area().interpolate(interpolation).x(function (d) {
          if (interpolation === 'step-before') return x(d.x + d.dx / 2);
          return x(d.x);
        }).y0(width / 2).y1(function (d) {
          return y(d.y);
        });

        var line = d3.svg.line().interpolate(interpolation).x(function (d) {
          if (interpolation === 'step-before') return x(d.x + d.dx / 2);
          return x(d.x);
        }).y(function (d) {
          return y(d.y);
        });

        var gPlus = svg.append('g');
        var gMinus = svg.append('g');
        gPlus.append('path').datum(data).attr('class', 'area').attr('d', area).style('fill', violinColor);
        gPlus.append('path').datum(data).attr('class', 'violin').attr('d', line).style('stroke', violinColor);
        gMinus.append('path').datum(data).attr('class', 'area').attr('d', area).style('fill', violinColor);
        gMinus.append('path').datum(data).attr('class', 'violin').attr('d', line).style('stroke', violinColor);

        var x = width;

        gPlus.attr('transform', 'rotate(90,0,0)  translate(0,-' + width + ')');
        gMinus.attr('transform', 'rotate(90,0,0) scale(1,-1)');
      }

      function addBoxPlot(svg, results, height, width, domain, boxPlotWidth, boxColor, boxInsideColor) {

        var y = d3.scale.linear().range([height, 0]).domain(domain);

        var x = d3.scale.linear().range([0, width]);

        var left = 0.5 - boxPlotWidth / 2;
        var right = 0.5 + boxPlotWidth / 2;

        var probs = [0.05, 0.25, 0.5, 0.75, 0.95];
        var probsPer = [0.05, 0.25, 0.5, 0.75, 0.95];

        var iterProbs = 0;
        for (; iterProbs < probs.length; iterProbs++) {
          probs[iterProbs] = y(d3.quantile(results.results, probs[iterProbs]));
        }

        svg.append('rect')
          .attr('class', 'boxplot fill')
          .attr('x', x(left))
          .attr('width', x(right) - x(left))
          .attr('y', probs[3])
          .attr('height', -probs[3] + probs[1])
          .style('fill', boxColor);

        var iS = [0, 2, 4];
        var iSclass = ['', 'median', ''];

        var iSColor = [boxColor, boxInsideColor, boxColor];

        for (var iter = 0; iter < iS.length; iter++) {
          svg.append('line')
            .attr('class', 'boxplot ' + iSclass[iter])
            .attr('x1', x(left))
            .attr('x2', x(right))
            .attr('y1', probs[iS[iter]])
            .attr('y2', probs[iS[iter]])
            .style('fill', iSColor[iter])
            .style('stroke', iSColor[iter]);

          var numberValue = parseFloat(Math.round(probs[iS[iter]] * 100) / 100).toFixed(2);

          var valueLegend = '';

          if ($scope.vis.params.showValue) {
            valueLegend = numberValue;
          }

          if ($scope.vis.params.showPercentage) {
            valueLegend += ' (' + (probsPer[iS[iter]] * 100) + ' %)';
          }

          if (valueLegend !== '') {
            svg.append('text').attr('x', x(left) + 30).attr('y', probs[iS[iter]]).attr('dy', '.32em').text(valueLegend);
          }

          // Label at bottom
          /*
          svg.append("text").attr("class", "textLabel").attr("dy", ".32em")
          .text(results.textLabel);


          var coord = svg.select(".textLabel")[0][0].getBoundingClientRect();
          var width = coord.width;

          svg.select(".textLabel")
          .attr("y", (-coord.height - 20))
          .attr("y", (-coord.width - 20))
          .attr("transform", "rotate(90,0,0)");
          */
        }

        // Label at bottom
        svg.append('text').attr('class', 'textLabel').attr('y', probs[iS[0]] + 20).attr('dy', '.32em').text(results.textLabel);

        var coord = svg.select('.textLabel')[0][0].getBoundingClientRect();
        var width = coord.width;

        svg.select('.textLabel').attr('y', -coord.height - 20).attr('x', (height / 2) + 80).attr('transform', 'rotate(90,0,0)');

        var iS = [
          [0, 1],
          [3, 4]
        ];
        for (var i = 0; i < iS.length; i++) {
          svg.append('line')
            .attr('class', 'boxplot')
            .attr('x1', x(0.5))
            .attr('x2', x(0.5))
            .attr('y1', probs[iS[i][0]])
            .attr('y2', probs[iS[i][1]])
            .style('stroke', boxColor);
        }

        svg.append('rect')
          .attr('class', 'boxplot')
          .attr('x', x(left))
          .attr('width', x(right) - x(left))
          .attr('y', probs[3])
          .attr('height', -probs[3] + probs[1])
          .style('stroke', boxColor);

        svg.append('circle')
          .attr('class', 'boxplot mean')
          .attr('cx', x(0.5))
          .attr('cy', y(d3.mean(results.results)))
          .attr('r', x(boxPlotWidth / 5))
          .style('fill', boxInsideColor)
          .style('stroke', 'None');

        svg.append('circle')
          .attr('class', 'boxplot mean')
          .attr('cx', x(0.5))
          .attr('cy', y(d3.mean(results.results)))
          .attr('r', x(boxPlotWidth / 10))
          .style('fill', boxColor)
          .style('stroke', 'None');
      }

      var _buildVis = function (root) {

        if (!root) return;

        var results = root.data;
        boxSpacing = 3;

        boxWidth = $scope.vis.params.boxWidth ? parseInt($scope.vis.params.boxWidth) : 50;

        if ($scope.vis.params.inferDomain) {
          domain = [root.minValue, root.maxValue];
        } else {
          domain = [$scope.vis.params.domainLower ? parseInt($scope.vis.params.domainLower) : -10,
            $scope.vis.params.domainUpper ? parseInt($scope.vis.params.domainUpper) : 10
          ];
        }

        y = d3.scale.linear().range([height - margin.bottom, margin.top]).domain(domain);

        yAxis = d3.svg.axis()
          .scale(y)
          .ticks(10)
          .orient('left')
          .tickSize(5, 0, 5);

        var svg = d3.select('[role="boxplot1"]')
          .attr('width', width)
          .attr('height', height);

        svg.append('line')
          .attr('class', 'boxplot')
          .attr('x1', margin.left)
          .attr('x2', width - margin.right)
          .attr('y1', y(0))
          .attr('y2', y(0))
          .style('stroke', $scope.vis.params.yAxisLineColor ? $scope.vis.params.yAxisLineColor : 'black');

        var boxSpacingNew = boxSpacing;

        for (var i = 0; i < results.length; i++) {

          boxSpacing = boxSpacingNew;

          if ($scope.vis.params.showValue) {
            boxSpacing += 35;
          }

          if ($scope.vis.params.showPercentage) {
            boxSpacing += 35;
          }

          if ($scope.vis.params.showValue && $scope.vis.params.showPercentage) {
            boxSpacing += 10;
          }

          var g = svg.append('g')
            .attr('transform', 'translate(' + (i * (boxWidth + boxSpacing) + margin.left) + ',0)');

          if ($scope.vis.params.showViolin) {
            addViolin(g, results[i], height, boxWidth, domain, 0.25, '#cccccc');
          }

          if ($scope.vis.params.showBoxPlot) {
            addBoxPlot(g, results[i], height, boxWidth, domain, .15,
              $scope.vis.params.boxColor ? $scope.vis.params.boxColor : 'black', 'white');
          }
        }

        svg.append('g')
          .attr('class', 'axis')
          .attr('transform', 'translate(' + margin.left + ',0)')
          .call(yAxis)
          .selectAll('*')
          .style('stroke', $scope.vis.params.yAxisLineColor ? $scope.vis.params.yAxisLineColor : 'black')
          .style('text', $scope.vis.params.yAxisTextColor ? $scope.vis.params.yAxisTextColor : 'black');
      };



      var _updateDimensions = function () {
        var delta = 10;
        var w = $(svgRoot).parent().width() - 10;
        var h = $(svgRoot).parent().height() - 10;
        if (w) {
          if (w > delta) {
            w -= delta;
          }
          width = w;
        }
        if (h) {
          if (h > delta) {
            h -= delta;
          }
          height = h;
        }
      };

      var _render = function (data) {
        // Cleanning
        d3.select(svgRoot).select('[role="boxplot1"]').selectAll('g').remove();
        d3.select(svgRoot).select('[role="boxplot1"]').selectAll('line').remove();
        _updateDimensions();
        $(svgRoot).find('svg').css('width', width).css('height', height);

        _buildVis(globalData);
      };

      $scope.$on('change:vis', function () {
        _render(globalData);
      });

      $scope.$watch('esResponse', function (resp) {
        if (resp) {
          globalData = boxplotViolinAggResponse($scope.vis, resp);
          _render(globalData);
        }
      });
    });
});
