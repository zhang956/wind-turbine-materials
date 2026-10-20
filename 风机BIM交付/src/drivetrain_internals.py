"""Functional stage envelopes, not manufacturer gear geometry or mesh kinematics."""
from math import sin,cos,pi
SOURCE='S05: Vestas 0004-6207 V05 (2010), pp7-8, 50Hz VCS; one planetary + two helical stages; nominal ratio 112.8'
NOTE='2010 V90 50Hz VCS功能示意；与S01中文结构描述存在版本差异。齿数、各级比、行星轮数量、尺寸及内部轴距未确认；光滑包络与斜线仅表达功能，不代表精确啮合；中间级无转速动画。'
def build(box,cyl,ring,tube):
    sys='06 传动链'
    def C(id,name,loc,r,d,mat='Steel'):
        return cyl('GEARBOX.INTERNAL.'+id,name,sys,loc,r,d,mat,axis='X',source=SOURCE,notes=NOTE)
    ring('GEARBOX.INTERNAL.RING','行星级内齿圈包络（无齿形）',sys,(1.65,0,80),.77,.63,.40,'Steel',axis='X',source=SOURCE,notes=NOTE)
    C('SUN','行星级太阳轮包络',(1.65,0,80),.20,.42,'Yellow')
    for i in range(3):
        a=i*2*pi/3
        C(f'PLANET.{i+1}',f'行星轮包络{i+1}（数量示意）',(1.65,.42*cos(a),80+.42*sin(a)),.21,.38,'Copper')
    for stage,x,pairs in [(2,2.48,[(80,.29),(80.44,.15)]),(3,3.12,[(80.44,.15),(80.22,.07)])]:
        for i,(z,r) in enumerate(pairs,1):
            C(f'HELICAL.{stage}.{i}',f'斜齿级{stage-1}齿轮包络{i}（无精确齿形）',(x,0,z),r,.28,'Copper' if i==1 else 'Yellow')
            # One oblique surface stripe denotes helix, not a tooth or tooth count.
            pts=[(x-.13+.26*j/16,(r+.006)*cos(j*pi/32),z+(r+.006)*sin(j*pi/32)) for j in range(17)]
            tube(f'GEARBOX.INTERNAL.HELIX.{stage}.{i}','斜向纹理标记（非轮齿）',sys,pts,.009,'Dark',source=SOURCE,notes=NOTE)
    C('LINK.1','太阳轮至平行轴级连接示意',(2.06,0,80),.065,.9)
    C('LINK.2','中间轴连接示意',(2.8,0,80.44),.05,.9)
    C('LINK.3','输出连接示意',(3.35,0,80.22),.045,.4)
