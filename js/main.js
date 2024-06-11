var key = [2815074099, 1725469378, 4039046167, 874293617, 3063605751, 3133984764, 4097598161, 3620741625];
var iv = sjcl.codec.hex.toBits("7475383967656A693334307438397532");
sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();

let data
let dwellers = []
let dwellersObj = {}
let family = []
let network

const gender = {
  1: "female",
  2: "male",
}


const sav_file = document.getElementById("sav_file")
sav_file.addEventListener("change", handleFileSelect)

const maleSelection = document.getElementById("male")
maleSelection.addEventListener("change", handleChangeDropdown)

const femaleSelection = document.getElementById("female")
femaleSelection.addEventListener("change", handleChangeDropdown)

const modeSelection = document.getElementById("mode")
modeSelection.addEventListener("change", drawVisNetwork)

function getMid(d) {
  const mother = d.relations.ascendants[1]
  return mother !== -1 ? mother : undefined;
}

function getFid(d) {
  const father = d.relations.ascendants[0]
  return father !== -1 ? father : undefined;
}

function getPids(dweller) {
  const pids = new Set()
  const index = dweller.gender === 1 ? 1 : 0
  for (const d of dwellers) {
    const child = d.relations.ascendants[index] === dweller.serializeId
    if (!child) continue

    const partner = d.relations.ascendants[Math.abs(index - 1)]
    if (partner) pids.add(partner)
  }
  return Array.from(pids)
}

function transformDwellers(data) {
  dwellers = data.dwellers.dwellers.sort((a, b) => a.serializeId - b.serializeId)
  dwellersObj = Object.fromEntries(dwellers.map(d => [d.serializeId, d]))
  const family = dwellers.map(d => {
    const sex = d.gender === 1 ? "F" : "M"
    const details = {
      key: d.serializeId,
      n: `${d.name} ${d.lastName}`,
      s: sex,
      m: getMid(d),
      f: getFid(d),
    }

    const partners = getPids(d)
    if (sex === "M") {
      details.ux = partners
    } else if (sex === "F") {
      details.vir = partners
    }

    return details
  })

  return family
}

function fullname(d) {
  return `${d.name} ${d.lastName}`
}

function setupOptions() {
  const defaultOption = "<option selected disabled>-</option>"
  maleSelection.innerHTML = defaultOption;
  femaleSelection.innerHTML = defaultOption;

  ([...dwellers]).sort((a, b) => {
    if (a.name < b.name) return -1
    if (a.name > b.name) return 1
    return 0
  }).forEach(d => {
    const option = document.createElement("option")
    option.value = d.serializeId
    option.innerText = fullname(d)
    if (d.gender === 1) {
      femaleSelection.appendChild(option)
    } else if (d.gender === 2) {
      maleSelection.appendChild(option)
    }
  })
}

function handleChangeDropdown() {
  const resultDiv = document.querySelector(".compability-result")
  resultDiv.style.backgroundColor = "rgba(0, 0, 0, 0)"
  resultDiv.innerHTML = ""

  const male = dwellersObj[maleSelection.value]
  const female = dwellersObj[femaleSelection.value]
  const ma = male?.relations?.ascendants?.filter(a => a !== -1) || []
  const fa = female?.relations?.ascendants?.filter(a => a !== -1) || []

  if (!male || !female) return

  console.log({
    male: {
      id: male.serializeId,
      name: fullname(male),
      relations: male.relations.ascendants
    },
    female: {
      id: female.serializeId,
      name: fullname(female),
      relations: female.relations.ascendants
    },
  })

  const directRelative = (ma.includes(female?.serializeId)) || (fa.includes(male?.serializeId))
  if (directRelative) {
    resultDiv.style.backgroundColor = "red"
    return resultDiv.innerHTML = "<p>Parent / Child</p>"
  }

  let result = "<p>OK!</p>"
  let backgroundColor = "#00FF00"
  for (const a of ma) {
    console.log({ a })
    if (fa.includes(a)) {
      const relative = dwellersObj[a]
      backgroundColor = "red"
      result = `<p>Family with <span class="highlight">${fullname(relative)}</span></p>`
      break
    }
  }

  resultDiv.style.backgroundColor = backgroundColor
  resultDiv.innerHTML = result
}

function drawVisNetwork() {
  const mode = modeSelection.value
  const color = {
    background: "black",
    border: "#00FF00",
    highlight: {
      background: "lightgreen",
      border: "lightgreen"
    }
  }
  const nodes = Object.fromEntries(
    dwellers.map(d => [d.serializeId, {
      id: d.serializeId,
      label: fullname(d),
      shape: d.gender === 1 ? "dot" : "square",
      color,
      font: {
        color: "#00FF00",
        strokeWidth: 2,
        strokeColor: "darkgreen",
      },
      level: mode === "tree" ? walkAncestors(d.serializeId) * 2 : undefined,
    }])
  )


  let options = {}
  let edges = []
  if (mode === "tree") {
    dwellers.forEach(d => {
      let [fid, mid] = d.relations.ascendants
      if (fid === d.serializeId) fid = -1
      if (mid === d.serializeId) mid = -1
      if (fid === -1 && mid === -1) return


      const nodeId = `${fid}_${mid}`
      let edgeNode = nodes[nodeId]
      if (!edgeNode) {
        const fatherNode = nodes[fid]
        const motherNode = nodes[mid]

        const level = Math.max(fatherNode?.level ?? 0, motherNode?.level ?? 0) + 1
        nodes[nodeId] = {
          id: nodeId,
          shape: "triangleDown",
          size: 10,
          color: {
            background: "#00FF00",
            border: "#00FF00",
            highlight: {
              background: "lightgreen",
              border: "lightgreen",
            }
          },
          level,
        }

        edgeNode = nodes[nodeId]
      }

      if (fid !== -1) {
        edges.push({
          from: fid,
          to: nodeId,
        })
      }

      if (mid != -1) {
        edges.push({
          from: mid,
          to: nodeId,
        })
      }

      edges.push({
        from: nodeId,
        to: d.serializeId,
      })
    })


    options = {
      edges: {
        smooth: {
          type: 'cubicBezier',
          forceDirection: 'vertical',
          roundness: 1,
        },
        color: { color: "#00FF00", highlight: "lightgreen" },
      },
      layout: {
        hierarchical: {
          enabled: true,
          nodeSpacing: 150,
        },
      },
      physics: true
    };
  } else if (mode === "network") {
    const set = []
    dwellers.forEach(d => {
      d.relations.ascendants.forEach(a => {
        if (a !== -1 && a !== d.serializeId) {
          const relation = [d.serializeId, a].sort().toString()
          if (set.indexOf(relation) === -1) set.push(relation)
        }
      })
    })

    edges = set.map(s => s.split(",")).map(s => ({
      from: s[0],
      to: s[1],
      color: { color: "#00FF00", highlight: "lightgreen" },
    }))
  }



  // create a network
  const container = document.getElementById("mynetwork");
  const data = {
    nodes: new vis.DataSet(Object.values(nodes)),
    edges: new vis.DataSet(edges),
  };
  network = new vis.Network(container, data, options);
  network.on("click", console.log)
}

function setup(data) {
  family = transformDwellers(data)
  drawVisNetwork()
  setupOptions()

  document.getElementById("vaultName").innerText = data.vault.VaultName;
  document.getElementById("dwellersCount").innerText = data.dwellers.dwellers.length;
  document.getElementById("result").innerText = ""
}

function load() {
  try {
    const str = localStorage.getItem("sav_data")
    if (str) {
      const data = JSON.parse(str)
      setup(data)
    }
  } catch (e) {
    console.error("failed to load data from localStorage", e)
  }
}

function handleFileSelect(evt) {
  try {
    evt.stopPropagation();
    evt.preventDefault();
    const f = evt.target.files[0];
    if (f.size > 3e7) {
      throw "File exceeds maximum size of 30MB"
    }
    if (f) {
      var reader = new FileReader;
      reader.onload = function() {
        try {
          data = decrypt(reader.result)
          localStorage.setItem("sav_data", JSON.stringify(data))
          setup(data)
        } catch (e) {
          alert("Error: " + e)
          console.error(e)
        }
      };
      reader.readAsText(f)
    }
  } catch (e) {
    alert("Error: " + e)
  } finally {
    evt.target.value = null
  }
}

function decrypt(base64Str) {
  var cipherBits = sjcl.codec.base64.toBits(base64Str);
  var prp = new sjcl.cipher.aes(key);
  var plainBits = sjcl.mode.cbc.decrypt(prp, cipherBits, iv);
  var jsonStr = sjcl.codec.utf8String.fromBits(plainBits);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw "Decrypted file does not contain valid JSON: " + e
  }
}

function drawRelations(id) {
  const dweller = dwellersObj[id]
  if (!dweller) return

  console.log({
    id: dweller.serializeId,
    name: `${dweller.name} ${dweller.lastName}`,
    gender: gender[dweller.gender],
    relations: dweller.relations.ascendants
      .filter(a => a !== -1)
      .map(a => {
        const relation = dwellersObj[a]
        if (!relation) return null
        return {
          id: relation.serializeId,
          name: `${relation.name} ${relation.lastName}`,
          gender: gender[relation.gender],
        }
      })
  })
}

function walkAncestors(id, x = 0) {
  const dweller = dwellersObj[id]
  const [fid, mid] = dweller.relations.ascendants

  let father = 0;
  if (fid !== -1 && fid !== id) {
    father = 1 + walkAncestors(fid, x + 1)
  }

  let mother = 0
  if (mid !== -1 && mid !== id) {
    mother = 1 + walkAncestors(mid, x + 1)
  }

  return Math.max(father, mother)
}

window.addEventListener("DOMContentLoaded", load)
