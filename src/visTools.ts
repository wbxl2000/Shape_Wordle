import { createCanvas, createImageData, Canvas } from "canvas"
import { ColorInterpolator } from "color-extensions"
import fs from "fs"
import { Options, keyword } from "./interface"
import { twoDimenArray } from "./helper"
import { region } from "./interface"
import { iterate } from "./spiral"

const prefix = "VisTool_"

export function groupVis(groupData: twoDimenArray, options: Options, outputDir: string) {
  const canvas = createCanvas(options.width, options.height)
  const ctx = canvas.getContext("2d")
  const colors = options.colors
  const [width, height] = groupData.getShape()

  // 用ImageData批量填充
  const imgData = createImageData(options.width, options.height)
  let img_i = 0
  const allGroupData = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (allGroupData.indexOf(groupData.get(x, y)) === -1) allGroupData.push(groupData.get(x, y))
      const color = hexToRgb(colors[groupData.get(x, y)])
      imgData.data[img_i] = color[0]
      imgData.data[img_i + 1] = color[1]
      imgData.data[img_i + 2] = color[2]
      imgData.data[img_i + 3] = 255
      img_i += 4
    }
  }
  console.log("分组数据为", allGroupData)
  ctx.putImageData(imgData, 0, 0)
  const buf = canvas.toBuffer()

  fs.writeFileSync(`${outputDir}/${prefix}groupVis.png`, buf)
}

export function distanceVis(
  distData: twoDimenArray[],
  options: Options,
  outputDir: string,
  outputImage: boolean = true
) {
  const { width, height } = options
  // 获取最大最小值
  let max = -Infinity
  let min = Infinity
  distData.forEach((item) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (item.get(x, y) > max) max = item.get(x, y)
        if (item.get(x, y) < min) min = item.get(x, y)
      }
    }
  })

  // 构建colormap
  const colorMap = {
    0: "#fff",
    // 1.0: "#0000ff"
    1.0: "#ff0000",
  }
  const interpolator = new ColorInterpolator(colorMap)

  const canvas = createCanvas(options.width, options.height)
  const ctx = canvas.getContext("2d")
  const imgData = createImageData(options.width, options.height)
  for (let dist of distData) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distValue = dist.get(x, y)
        if (distValue > 0) {
          const i = (y * options.width + x) * 4
          const color = interpolator.getColor((distValue - min) / (max - min), "object")
          imgData.data[i] = color.r
          imgData.data[i + 1] = color.g
          imgData.data[i + 2] = color.b
          imgData.data[i + 3] = 255
        }
      }
    }
  }

  if (outputImage) {
    ctx.putImageData(imgData, 0, 0)
    const buf = canvas.toBuffer()
    fs.writeFileSync(`${outputDir}/${prefix}distanceVis.png`, buf)
  }
  return imgData
}

export function contourVis(contourData: number[][][], options: Options, outputDir: string) {
  const canvas = createCanvas(options.width, options.height)
  const ctx = canvas.getContext("2d")
  const imgData = createImageData(options.width, options.height)
  const colors = options.colors
  for (let i in contourData) {
    for (let j of contourData[i]) {
      const x = j[1]
      const y = j[0]
      const imgData_i = (x * options.width + y) * 4
      const color = hexToRgb(colors[i])
      imgData.data[imgData_i] = color[0]
      imgData.data[imgData_i + 1] = color[1]
      imgData.data[imgData_i + 2] = color[2]
      imgData.data[imgData_i + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)
  const buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}contourVis.png`, buf)
}

export function extremePointVis(
  distData: twoDimenArray[],
  regions: region[],
  options: Options,
  outputDir: string,
  drawText = true,
  outputInfo = true
) {
  const distanceImageData = distanceVis(distData, options, outputDir)
  const canvas = createCanvas(options.width, options.height)
  const ctx = canvas.getContext("2d")
  ctx.putImageData(distanceImageData, 0, 0)

  regions.forEach((region) => {
    const points = region.extremePoints
    points.forEach((point, epID) => {
      if (outputInfo) console.log(`regionID:${point.regionID} epID: ${epID}\n`, point)
      ctx.beginPath()
      ctx.arc(point.pos[0], point.pos[1], 3, 0, 360)
      ctx.fillStyle = "yellow"
      ctx.fill()
      ctx.closePath()

      if (drawText) {
        ctx.font = "15px Arial"
        ctx.fillStyle = "black"
        let info = `
        value: ${point.value}
        regionID:${point.regionID}
        epID:${epID}
        `
        const width = ctx.measureText(info).actualBoundingBoxRight
        ctx.fillText(info, point.pos[0] - width, point.pos[1])
      }
    })
  })
  const ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}extremePointVis.png`, buf)
  return ImageData
}

export function allocateWordsVis(
  distData: twoDimenArray[],
  regions: region[],
  keywords: keyword[],
  options: Options,
  outputDir: string,
  outputInfo = true
) {
  let epImageData = distanceVis(distData, options, outputDir, false)

  const canvas = createCanvas(options.width, options.height)
  const ctx = canvas.getContext("2d")
  ctx.putImageData(epImageData, 0, 0)
  regions.forEach((region) => {
    const points = region.extremePoints
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.pos[0], point.pos[1], 3, 0, 360)
      ctx.fillStyle = "yellow"
      ctx.fill()
      ctx.closePath()
    })
  })
  epImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  regions.forEach((region) => {
    const points = region.extremePoints
    points.forEach((point, epID) => {
      ctx.font = "15px Arial"
      ctx.fillStyle = "black"
      let info = `value: ${point.value}\nnumber:${point.epNumber}\nregionID:${point.regionID}\nepID:${epID}`
      const width = ctx.measureText(info).actualBoundingBoxRight
      ctx.fillText(info, point.pos[0] - width, point.pos[1])
    })
  })
  let buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}allocateWordsVis_Numbers.png`, buf)

  // console.log(keywords.map((word) => [word.name, word.weight]))
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.putImageData(epImageData, 0, 0)
  regions.forEach((region, regionID) => {
    const points = region.extremePoints
    points.forEach((point, epID) => {
      ctx.font = "10px Arial"
      ctx.fillStyle = "black"
      let info = ""
      keywords.forEach((word) => {
        if (word.regionID === regionID && word.epID === epID) {
          info += `${word.name},${word.weight}\n`
        }
      })
      if (outputInfo)
        console.log(`regionID:${regionID} epID${epID} words: ${info.replace(/\n/g, "  ")}`)
      const width = ctx.measureText(info).actualBoundingBoxRight
      ctx.fillText(info, point.pos[0] - width, point.pos[1])
    })
  })

  buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}allocateWordsVis_words.png`, buf)
}

export function spiralVis(
  dist: twoDimenArray[],
  regions: region[],
  options: Options,
  outputDir: string
) {
  const { width, height } = options

  let epImageData = distanceVis(dist, options, "", false)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")
  ctx.putImageData(epImageData, 0, 0)

  regions.forEach((region) => {
    const { extremePoints, dist: regionDist } = region
    extremePoints.forEach((extremePoint) => {
      const centerPoint = extremePoint.pos

      ctx.beginPath()
      ctx.arc(centerPoint[0], centerPoint[1], 3, 0, 360)
      ctx.fillStyle = "yellow"
      ctx.fill()
      ctx.closePath()

      let point: number[] | false = [centerPoint[0] + 1, centerPoint[1] + 1]
      for (let i = 0; i < 20000; i++) {
        point = iterate(regionDist, centerPoint, point, width, height)
        if (!point) {
          break
        }
        drawPoint(ctx, point[0], point[1])
      }
    })
  })

  const buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}SpiralVis.png`, buf)
}

export function wordsBoxVis(keywords: keyword[], outputDir: string) {
  const col = 4,
    wordWidth = 200,
    wordHeight = 200
  const length = keywords.length
  const canvasWidth = wordWidth * col,
    canvasHeight = (length / 4 + 1) * wordHeight
  const canvas = createCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext("2d")

  let startX = 0,
    startY = wordHeight
  keywords.forEach((word, wordID) => {
    const {
      name,
      color,
      angle,
      fontFamily,
      fontWeight,
      fontSize,
      ascent,
      descent,
      box: boxes,
    } = word

    const x = startX + wordWidth / 2,
      y = startY + wordHeight / 2

    // 绘制文字
    ctx.save()
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.translate(x, y)
    ctx.rotate(angle!)
    ctx.textAlign = "start"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(name, 0, 0)

    // 绘制box
    ctx.globalAlpha = 0.7
    // console.log(wordID, name, word.weight, boxes?.length)
    for (let i = 0; i < boxes!.length; i++) {
      const box = boxes![i]
      ctx.fillStyle = i === 0 ? "red" : "green"
      const width = box[2],
        height = box[3]
      const x = box[0],
        y = box[1] - height
      ctx.fillRect(x, y, width, height)
    }

    // 绘制ascent和descent线
    // console.log(ascent, descent)
    // drawLine(ctx, 0, -ascent!, wordWidth, -ascent!, "red")
    // drawLine(ctx, 0, descent!, wordWidth, descent!, "blue")
    ctx.restore()
    startX = wordID % col === 3 ? 0 : startX + wordWidth
    startY = wordID % col === 3 ? startY + wordHeight : startY
  })

  const buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}wordsBoxVis.png`, buf)
}

export function keyWordsVis(
  keywords: keyword[],
  dist: twoDimenArray[],
  options: Options,
  outputDir: string
) {
  const { width, height } = options

  let epImageData = distanceVis(dist, options, "", false)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")
  ctx.putImageData(epImageData, 0, 0)
  keywords.forEach((word) => {
    drawKeyword(ctx, word)
  })
  const buf = canvas.toBuffer()
  fs.writeFileSync(`${outputDir}/${prefix}keywordsVis.png`, buf)
}

export function outputCanvas(canvas: Canvas, filename: string = "") {
  filename = `${filename} ${Date.now()}`
  const buf = canvas.toBuffer()
  fs.writeFileSync(`canvas/${filename}.png`, buf)
}

function hexToRgb(hex: string) {
  const rgb: number[] = []
  hex = hex.substr(1) //去除前缀 # 号
  if (hex.length === 3) {
    // 处理 "#abc" 成 "#aabbcc"
    hex = hex.replace(/(.)/g, "$1$1")
  }
  hex.replace(/../g, (color) => {
    rgb.push(parseInt(color, 0x10)) //按16进制将字符串转换为数字
    return color
  })
  // 返回的是rgb数组
  return rgb
}

function drawKeyword(ctx: any, word: keyword) {
  const {
    name,
    color,
    position,
    width,
    height,
    angle,
    fontFamily,
    fontWeight,
    fontSize,
    box: boxes,
  } = word
  // 绘制文字
  ctx.save()
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  // ctx.fillStyle = color
  ctx.fillStyle = word.state ? "black" : "red"
  ctx.translate(position![0] - width! / 2, position![1] + height! / 2)
  ctx.rotate(angle)
  ctx.textAlign = "start"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(name, 0, 0)
  ctx.restore()
}

function drawPoint(ctx: any, x: number, y: number) {
  ctx.fillStyle = "black"
  ctx.fillRect(x, y, 1, 1)
}

function drawLine(ctx: any, x1: number, y1: number, x2: number, y2: number, color?: string) {
  ctx.beginPath()
  ctx.strokeStyle = color ? color : "black"
  ctx.lineWidth = 1
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.closePath()
}
