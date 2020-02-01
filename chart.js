const { CanvasRenderService } = require('chartjs-node-canvas');

async function genChart(width, height, data) {
    const total = data.TF + data.FF + data.TT + data.FT;

    const bgColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)'
    ];
    const configuration = {
        type: 'doughnut',
        data: {
            labels: ['Good', 'Bad'],
            datasets: [{
                data: [data.TF + data.TT, data.FF + data.FT],
                backgroundColor: bgColors
            },
            {
                data: [data.TT, data.FT],
                backgroundColor: bgColors
            }]
        }
    };
    const chartCallback = ChartJS => {
        ChartJS.defaults.global.defaultFontSize = 48;
        ChartJS.plugins.register({
            beforeDraw: function(ch){
                var ctx = ch.chart.ctx;
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                ctx.fillRect(0, 0, ch.chart.width, ch.chart.height);
            },
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const fontStyle = 'normal';
                const fontFamily = ChartJS.defaults.global.defaultFontFamily;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                chart.data.datasets.forEach(function(dataset, i) {
                    let dataSum = 0;
                    dataset.data.forEach(function(element) {
                        dataSum += element;
                    });

                    const meta = chart.getDatasetMeta(i);
                    if (!meta.hidden) {
                        meta.data.forEach(function(element, index) {
                            if (dataset.data[index] === 0) return;

                            ctx.fillStyle = '#fff';

                            const fontSize = 36;
                            ctx.font = ChartJS.helpers.fontString(fontSize, fontStyle, fontFamily);

                            const labelString = dataset.data[index].toString();
                            const dataString = (Math.round(dataset.data[index] / dataSum * 1000)/10).toString() + "%";

                            const padding = 5;
                            const position = element.tooltipPosition();
                            ctx.fillText(labelString, position.x, position.y - (fontSize / 2) - padding);
                            ctx.fillText(dataString, position.x, position.y + (fontSize / 2) - padding);
                        });
                    }
                    // 中央にテキスト表示
                    const fontSize = 60;
                    ctx.fillStyle = '#000';
                    ctx.font = ChartJS.helpers.fontString(fontSize, fontStyle, fontFamily);

                    ctx.fillText(`Total\n${total}`, chart.width / 2, chart.height / 2);
                });
            }
        });
    };

    const canvasRenderService = new CanvasRenderService(width, height, chartCallback);
    const image = await canvasRenderService.renderToBuffer(configuration);

    return image;
}

module.exports = {
    genChart
};
