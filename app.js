angular.module('app', ['chart.js'])

angular.module('app').controller('MainController', MainController)

MainController.$inject = ['$scope', '$http', '$timeout']

function MainController($scope, $http, $timeout) {
  const socket = io('localhost:3000')
  let current_id = -1
  $scope.charts = []
  $scope.temperature_charts = {}
  $scope.luminosity_charts = {}
  $scope.networks = []

  $http.get('/api/network').then(res => res.data).then(networks => {
    $scope.networks = networks
    createCharts()
    initDelayArrays()
  })

  const animateSensor = id => {
    const className = 'text-danger bold'
    if (current_id === id) return className
    return ''
  }

  const initDelayArrays = () => {
    // create delay arrays
    _.forEach($scope.networks, net => {
      net.delays = {}
      net.delays.temperature = []
      net.delays.luminosity = []
    })
  }

  const getTotalDelay = () => {
    let all_delays = []
    _.forEach($scope.networks, net => {
      net.delays.temperature.forEach(value => all_delays.push(value))
      net.delays.luminosity.forEach(value => all_delays.push(value))
    })
    return _.mean(all_delays)
  }

  /**
    * Socket.io
    */
  socket.on('message', message => {
    const curr_time = moment()
    const gateway_time = moment(message.gateway_time)

    const delay = curr_time.diff(gateway_time, 'milliseconds')

    const network = _.find($scope.networks, net => {
      return _.includes(net.mote_ids, message.id_mote)
    })

    current_id = message.id_mote

    console.log('New message from network ' + network.id, message)

    const temp = message.temperature || message.raw_temperature
    const lumi = message.luminosity || message.raw_luminosity
    const time = moment().format('hh:mm:ss')

    $timeout(() => {
      if (!network) return

      // temperature chart
      if (temp) {
        // push delay
        network.delays.temperature.push(delay)

        $scope.temperature_charts[network.id].data[0].push(temp)
        $scope.temperature_charts[network.id].labels.push(time)

        if ($scope.temperature_charts[network.id].data[0].length > 7) {
          $scope.temperature_charts[network.id].data[0].shift()
          $scope.temperature_charts[network.id].labels.shift()
        }
      }

      //luminosity chart
      if (lumi) {
        // push delay
        network.delays.luminosity.push(delay)

        $scope.luminosity_charts[network.id].data[0].push(lumi)
        $scope.luminosity_charts[network.id].labels.push(time)

        if ($scope.luminosity_charts[network.id].data[0].length > 7) {
          $scope.luminosity_charts[network.id].data[0].shift()
          $scope.luminosity_charts[network.id].labels.shift()
        }
      }
    }, 0)
  })

  /**
     * Chart
     */
  const createCharts = () => {
    _.forEach($scope.networks, network => {
      let chart = {}
      chart.options = { animation: false }
      chart.labels = [moment().format('LTS')]
      chart.series = ['A']
      chart.data = [[0]]

      $scope.charts[network.id] = chart

      $scope.temperature_charts[network.id] = _.cloneDeep(chart)

      chart.colors = ['#f7464a']

      $scope.luminosity_charts[network.id] = _.cloneDeep(chart)
    })
  }

  // expose functions
  $scope.animateSensor = animateSensor
  $scope.getTotalDelay = getTotalDelay
  $scope.meanBy = _.mean
}
