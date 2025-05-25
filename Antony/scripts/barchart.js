// Set margins and overall chart dimensions
const margin = { top: 40, right: 30, bottom: 60, left: 200 };
const fullWidth = 960;
const fullHeight = 600;

// Create the SVG container and base group
const svgContainer = d3.select("#chart")
  .append("svg")
  .attr("width", fullWidth)
  .attr("height", fullHeight);

const svg = svgContainer.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip setup (hidden by default)
const tooltip = d3.select("#tooltip");

// Reference to the story box
const storyBox = d3.select("#storyBox");

// Load and process the CSV data
d3.csv("cleandata_final.csv").then(data => {
  // Filter for rows using the per 1,000 inhabitants measure
  const filtered = data.filter(d => d["Unit of measure"] === "Per 1 000 inhabitants");

  // Get the latest value for each country
  const latestByCountry = Array.from(
    d3.group(filtered, d => d.REF_AREA),
    ([key, values]) => {
      const latest = values.reduce((a, b) => +a.TIME_PERIOD > +b.TIME_PERIOD ? a : b);
      return {
        iso: key,
        name: latest["Reference area"],
        value: +latest.OBS_VALUE,
        year: latest.TIME_PERIOD
      };
    }
  );

  // Set up scales
  const x = d3.scaleLinear().range([0, fullWidth - margin.left - margin.right]);
  const y = d3.scaleBand().padding(0.15); // y.range set dynamically

  // Sequential color scale from light to dark blue
  const colorScale = d3.scaleLinear()
    .domain([0, d3.max(latestByCountry, d => d.value)])
    .range(["#cce5ff", "#004085"]);

  // Create axis groups
  const xAxis = svg.append("g").attr("transform", `translate(0,0)`);
  const yAxis = svg.append("g");

  // Update function for slider interaction
  function update(n) {
    const topN = [...latestByCountry]
      .sort((a, b) => b.value - a.value)
      .slice(0, n);

    const barCount = topN.length;
    const chartMaxHeight = fullHeight - margin.top - margin.bottom;

    const decreaseBtn = d3.select("#decreaseBtn");
const increaseBtn = d3.select("#increaseBtn");

decreaseBtn.on("click", () => {
  let val = +slider.node().value;
  if (val > +slider.attr("min")) {
    val--;
    slider.node().value = val;
    sliderValue.text(val);
    update(val);
  }
});

increaseBtn.on("click", () => {
  let val = +slider.node().value;
  if (val < +slider.attr("max")) {
    val++;
    slider.node().value = val;
    sliderValue.text(val);
    update(val);
  }
});


    // Dynamic y-range: use fixed bar height for small sets, scale otherwise
    if (barCount < 10) {
      const barHeight = 30;
      const chartHeight = barHeight * barCount;
      svgContainer.attr("height", chartHeight + margin.top + margin.bottom);
      y.range([0, chartHeight]);
    } else {
      svgContainer.attr("height", fullHeight);
      y.range([0, chartMaxHeight]);
    }

    x.domain([0, d3.max(topN, d => d.value)]);
    y.domain(topN.map(d => d.name));

    // Draw axes
    xAxis.transition().call(d3.axisTop(x).ticks(5));
    yAxis.transition().call(d3.axisLeft(y));

    // Draw bars
    const bars = svg.selectAll("rect")
      .data(topN, d => d.name);

    bars.join(
      enter => enter.append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.name))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.value))
        .attr("fill", d => colorScale(d.value))
        .on("mouseover", (event, d) => {
          tooltip
            .classed("hidden", false)
            .html(`<strong>${d.name}</strong><br>${d.value.toFixed(1)} per 1,000<br>(${d.year})`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.classed("hidden", true)),
      update => update
        .transition()
        .attr("y", d => y(d.name))
        .attr("width", d => x(d.value))
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.value))
    );

    // Update story box content
    if (n <= 5) {
      storyBox.text("Nordic countries lead the pack with the highest per-capita health and social employment.");
    } else if (n <= 15) {
      storyBox.text("Mid-ranked nations like Canada, the UK, and Japan reflect strong workforce levels, though not the highest.");
    } else if (n >= 35) {
      storyBox.text("As we include all countries, systemic differences become clearer — lower values often reflect underinvestment or emerging systems.");
    } else {
      storyBox.text("Expanding the view reveals diversity in employment densities across OECD countries.");
    }
  }

  // Update function for country search
  function updateCountry(countryName) {
    const match = latestByCountry.find(d => d.name === countryName);
    if (!match) return;

    const data = [match];
    const barHeight = 30;
    svgContainer.attr("height", barHeight + margin.top + margin.bottom);
    y.range([0, barHeight]);
    y.domain(data.map(d => d.name));
    x.domain([0, match.value + 5]);

    // Draw axes
    xAxis.transition().call(d3.axisTop(x).ticks(5));
    yAxis.transition().call(d3.axisLeft(y));

    // Draw single bar
    const bars = svg.selectAll("rect")
      .data(data, d => d.name);

    bars.join(
      enter => enter.append("rect")
        .attr("x", 0)
        .attr("y", y(match.name))
        .attr("height", y.bandwidth())
        .attr("width", x(match.value))
        .attr("fill", colorScale(match.value))
        .on("mouseover", (event, d) => {
          tooltip
            .classed("hidden", false)
            .html(`<strong>${d.name}</strong><br>${d.value.toFixed(1)} per 1,000<br>(${d.year})`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.classed("hidden", true)),
      update => update
        .transition()
        .attr("y", y(match.name))
        .attr("width", x(match.value))
        .attr("height", y.bandwidth())
        .attr("fill", colorScale(match.value))
    );

    storyBox.text(`Showing data for ${match.name}, with ${match.value.toFixed(1)} workers per 1,000 people in ${match.year}.`);
  }

  // Slider interaction
  const slider = d3.select("#rankSlider");
  const sliderValue = d3.select("#sliderValue");

  slider.on("input", function () {
    const n = +this.value;
    sliderValue.text(n);
    update(n);
  });

  // Search input interaction
  const searchInput = d3.select("#countrySearch");
  const searchResult = d3.select("#searchResult");

  searchInput.on("input", function () {
    const query = this.value.trim().toLowerCase();
    if (query.length === 0) {
      searchResult.text("");
      update(+slider.node().value);
      return;
    }

    const match = latestByCountry.find(d => d.name.toLowerCase().includes(query));

    if (match) {
      searchResult.text(`Showing result for: ${match.name}`);
      updateCountry(match.name);
    } else {
      searchResult.text("No match found.");
    }
  });

  // Initial render with default slider value
  update(+slider.node().value);
});
