"""R02 tower internals. S02 confirms component TYPES, not these dimensions."""
import bpy, math
from math import pi, sin, cos, sqrt
SOURCE='https://www.vestas.com/content/dam/vestas-com/global/en/sustainability/reports-and-ratings/lcas/LCA_V902MW_version1.pdf.coredownload.inline.pdf'
NOTE='S02为GridStreamer版本，第81页B.4仅作同平台设施类型参考，不证明双馈批次配置；本构件尺寸、数量、标高和方位为估算，非原厂塔内布置图。模型按米制统一比例，未对内部件单独放大。'
SYS='02 塔内设施'

def radius(z):return 2.15-.9*z/78.3

def ladder_y(z):return -radius(z)+.55

def cut_box(obj,center,size):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    cutter=bpy.context.object;cutter.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=obj.modifiers.new('Access opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def build(box,cyl,ring,bolts,mesh,tube,objects):
    def sourced(fn):
        def call(*args,**kwargs):
            kwargs.setdefault('source',SOURCE);kwargs.setdefault('notes',NOTE);kwargs.setdefault('evidence','B cross-version facility reference / C dimensions and layout')
            return fn(*args,**kwargs)
        return call
    B,C,R,M,T=map(sourced,[box,cyl,ring,mesh,tube])
    # True doorway opening in the existing shell; door located at front (-Y).
    section=next(o for o in objects if o['AssetId']=='TOWER.SECTION.1')
    cut_box(section,(0,-2.0,1.75),(1.05,1.05,2.2))
    section['Notes']+=' R02增加真实网格门洞，洞口尺寸仍为估算。'
    door=B('TOWER.DOOR','塔门（开启示意）','01 基础与塔筒',(-.98,-2.47,1.75),(.98,.06,2.15),'Dark',notes='塔门洞口1.05×2.20m及门扇姿态为估算；为显示内部而开启。',evidence='C | estimated doorway')
    door.rotation_euler[2]=pi/3
    T('TOWER.DOOR.FRAME','塔门框','01 基础与塔筒',[(-.57,-2.1,.63),(-.57,-2.1,2.9),(.57,-2.1,2.9),(.57,-2.1,.63)],.05,'Steel',evidence='C | estimated doorway')
    for i in range(3):
        B(f'TOWER.ENTRY.STEP.{i+1}',f'入口踏步{i+1}','01 基础与塔筒',(0,-3.08+i*.32,.1+i*.2),(1.1,.34,.12),'Steel',evidence='C | estimated access steps')
    # Platforms have real access and cable openings; no disk blocking the ladder.
    levels=[.65,25.45,51.55,77.65]
    for i,z in enumerate(levels):
        key='BASE' if i==0 else str(i);r=radius(z)-.12;ly=ladder_y(z)
        platform=C('TOWER.PLATFORM.'+key,'塔底设备平台' if i==0 else f'第{i}层检修平台（带通行口）',SYS,(0,0,z),r,.075,'Steel',ifc='IfcSlab')
        if i:
            cut_box(platform,(0,ly+.05,z),(.76,.82,.3))
            # Hinged lid held fully open at right side of the access aperture.
            B('TOWER.HATCH.'+key,f'第{i}层平台翻板（开启）',SYS,(.43,ly+.05,z+.42),(.055,.78,.78),'Steel',evidence='C | access hatch detail')
            # Three sides of guardrail, leaving ladder approach free.
            pts=[(-.43,ly-.39,z+1.08),(-.43,ly+.49,z+1.08),(.43,ly+.49,z+1.08)]
            T('TOWER.GUARD.'+key,f'第{i}层通道护栏',SYS,pts,.022,'Yellow',evidence='C | estimated guarding')
            for j,(x,y) in enumerate([(-.43,ly-.39),(-.43,ly+.49),(.43,ly+.49)]):
                T(f'TOWER.GUARD.POST.{key}.{j}','平台护栏立柱',SYS,[(x,y,z+.05),(x,y,z+1.08)],.022,'Yellow',evidence='C | estimated guarding')
        cut_box(platform,(.72,.25,z),(.50,.4,.3))
        # Support ring with rails away from the ladder passage and cable aperture.
        R('TOWER.PLATFORM.SUPPORT.'+key,'平台边缘支承圈',SYS,(0,0,z-.10),r,r-.08,.09,'Steel',evidence='C | estimated platform support')
        for j,y in enumerate([.62,-.25]):
            length=2*sqrt(max(.1,(r-.03)**2-y*y))
            B(f'TOWER.PLATFORM.BEAM.{key}.{j}','平台支承横梁',SYS,(0,y,z-.15),(length,.06,.12),'Steel',evidence='C | estimated platform support')
    # Constant rung spacing and constant clear width; ladder follows tapered wall.
    for j,x in enumerate([-.27,.27]):
        T(f'TOWER.LADDER.RAIL.{j+1}','爬梯侧轨',SYS,[(x,ladder_y(.7),.7),(x,ladder_y(78),78)],.025,'Yellow')
    vs=[];fs=[]
    for i in range(258):
        z=.85+i*.3;y=ladder_y(z);b=len(vs)
        vs.extend([(x,yy,zz) for zz in [z-.016,z+.016] for x,yy in [(-.27,y-.022),(.27,y-.022),(.27,y+.022),(-.27,y+.022)]])
        fs.extend([tuple(b+k for k in face) for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
    M('TOWER.LADDER.RUNGS','爬梯踏棍组 / 0.30m示意步距',SYS,vs,fs,'Yellow',notes=NOTE+' 梯宽0.54m、踏棍间距0.30m仅为重建值。')
    T('TOWER.FALL.ARREST','爬梯防坠导向轨（示意）',SYS,[(0,ladder_y(.7)-.055,.7),(0,ladder_y(78)-.055,78)],.014,'Steel',evidence='C | safety rail type/detail unverified')
    for i,z in enumerate(range(2,78,4)):
        for j,x in enumerate([-.27,.27]):
            wall_y=-sqrt((radius(z)-.05)**2-x*x)
            T(f'TOWER.LADDER.BRACKET.{i}.{j}','爬梯固定支架',SYS,[(x,wall_y,z),(x,ladder_y(z),z)],.018,'Steel',evidence='C | attachment design unverified')
    # Cable ladder tray and separate power/control routes through platform openings.
    for j,x in enumerate([.53,.91]):T(f'TOWER.TRAY.RAIL.{j}','电缆桥架纵梁',SYS,[(x,.34,.8),(x,.34,76.4)],.022,'Steel')
    for i in range(76):
        z=1+i
        T(f'TOWER.TRAY.RUNG.{i}','桥架横撑 / 电缆固定位置',SYS,[(.53,.34,z),(.91,.34,z)],.013,'Steel')
    for i,x in enumerate([.58,.68,.78]):
        T(f'TOWER.POWER.CABLE.{i+1}','塔内动力电缆',SYS,[(x,.24,.75),(x,.24,74.5),(x,.1,76.4)],.027,'Dark',notes=NOTE+' 电缆根数、截面、弯曲半径及回路未按原机电气图确认。')
    T('TOWER.CONTROL.CABLE','塔内控制通信电缆',SYS,[(.86,.24,.75),(.86,.24,76.4)],.012,'Blue')
    # Top torsion allowance represented as broad curves, not claimed exact routing.
    for i in range(3):
        x=.35+i*.10
        T(f'TOWER.CABLE.LOOP.{i+1}','塔顶电缆扭转余量段（示意）',SYS,[(x,.1,78.6),(x,.2,76.8),(x,.4,76.2),(x,.55,76.8),(x,.5,78.0)],.027,'Dark',evidence='C | cable loop geometry unverified')
    # Bottom controller type confirmed by manufacturer LCA; quantity/layout unknown.
    for i,x in enumerate([-.75,.1]):
        B(f'TOWER.CONTROL.CABINET.{i+1}',f'塔底控制柜{i+1}（包络重建）',SYS,(x,.95,1.62),(.72,.55,1.85),'Shell',ifc='IfcElectricDistributionBoard')
        B(f'TOWER.CONTROL.DOOR.{i+1}','控制柜门板',SYS,(x,.665,1.62),(.66,.025,1.70),'Blue')
        B(f'TOWER.CONTROL.HANDLE.{i+1}','控制柜门把手',SYS,(x+.22,.64,1.60),(.025,.035,.18),'Steel',evidence='C | cabinet detail')
        B(f'TOWER.CONTROL.DISPLAY.{i+1}','控制柜操作面板（无实时数据）',SYS,(x,.635,2.05),(.20,.02,.12),'Dark',evidence='C | cabinet detail')
    # Lighting / earth circuit are explicit schematic supplements, not sourced exact equipment.
    for i,z in enumerate([2.6,12,25.9,38,52,64,76.7]):
        x=-radius(z)+.16
        B(f'TOWER.LIGHT.{i+1}','塔内照明灯（位置示意）',SYS,(x,.25,z),(.08,.16,.42),'Shell',ifc='IfcLightFixture',evidence='C | lighting layout unverified')
        T(f'TOWER.LIGHT.BRACKET.{i+1}','灯具支架',SYS,[(x-.07,.25,z),(x+.03,.25,z)],.015,'Steel',evidence='C | lighting layout unverified')
    T('TOWER.EARTH.CONDUCTOR','塔内接地导体（示意）',SYS,[(1.5,.3,.7),(1.4,.3,26),(.9,.3,52),(.9,.4,77.7)],.009,'Copper',evidence='C | earthing design unverified')
    B('TOWER.EARTH.BAR','塔底等电位连接排（示意）',SYS,(1.5,.3,1.05),(.03,.4,.05),'Copper',evidence='C | earthing design unverified')
