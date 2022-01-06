window.addEventListener("load", start);
window.addEventListener("resize", start);

function start()
{
	// getting values from all sliders
	var angle_s = document.getElementById("angle_id");
	var velocity_s = document.getElementById("velocity_id");
	var ground_level_s = document.getElementById("ground_level_id");
	var pole_height_s = document.getElementById("pole_height_id");
	var radius_s = document.getElementById("radius_id");
	var precision_s = document.getElementById("precision_id");
	var gravity_s = document.getElementById("gravity_id");

	var angle = parseInt(angle_s.value);
	var velocity = parseInt(velocity_s.value);
	var ground_level = parseInt(ground_level_s.value);
	var pole_width = 10;
	var pole_height = parseInt(pole_height_s.value);
	var pole_x = 100;
	var radius = parseInt(radius_s.value);
	var precision = parseInt(precision_s.value);
	var gravity = parseInt(gravity_s.value);

	document.getElementById("angle_val").innerHTML = angle;
	document.getElementById("velocity_val").innerHTML = velocity;
	document.getElementById("ground_level_val").innerHTML = ground_level;
	document.getElementById("pole_height_val").innerHTML = pole_height;
	document.getElementById("radius_val").innerHTML = radius;
	document.getElementById("precision_val").innerHTML = precision;
	document.getElementById("gravity_val").innerHTML = gravity;

	draw(angle, velocity, ground_level, pole_width, pole_height, pole_x, radius, precision, gravity);
}

async function draw(angle, velocity, ground_level, pole_width, pole_height, pole_x, radius, precision, gravity)
{
	var canvas = document.getElementById("canv");
	var cw = canvas.width;
	var ch = canvas.height;
	var context = canvas.getContext("2d");
	context.clearRect(0, 0, cw, ch)

	context.save();
	context.fillStyle = "#E0E0E0";
	context.strokeStyle = "#A5E6E6";
	// context.strokeStyle = "#FF0000";
	context.lineWidth = 3;
	drawGround(context, cw, ch, ground_level);
	drawPole(context, cw, ch, pole_width, pole_height, pole_x, ch-ground_level-pole_height);

	drawPath(context, cw, ch, angle, velocity, gravity, pole_height, ground_level, precision, pole_x + pole_width/2.0);

	// context.fillStyle = "#A5E6E6";
	context.fillStyle = "#FF0000";
	drawObject(context, cw, ch, radius, pole_x + pole_width/2.0, ch-ground_level-pole_height);
	context.fillStyle = "#E0E0E0";
}

function drawGround(context, cw, ch, height)
{
	var groundWidth = cw;
	var groundPosX = 0
	var groundPosY = ch - height;
	context.fillRect(groundPosX, groundPosY, groundWidth, height);
}

// height - height of the pole
function drawPole(context, cw, ch, width, height, x, y)
{
	context.fillRect(x, y, width, height);
}

function drawObject(context, cw, ch, radius, x, y)
{
	fillCircle(context, x, y, radius);
}

function fillCircle(ctx, x, y, r)
{
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fill();
}

function drawPath(context, cw, ch, angle, velocity, gravity, pole_height, ground_height, precision, x0)
{
	var ground_y = ch - ground_height;
	var pole_y = ground_y - pole_height;
	var y0 = pole_y;

	if(precision == 0)
	{
		return;
	}
	while(angle < 0) // in js modulo on negative numbers does not work xD
	{
		angle += 360;
	}
	if(angle >= 360)
	{
		angle = angle % 360;
	}
	var angle_rad = angle * Math.PI / 180.0;

	context.beginPath();
	context.moveTo(x0, y0);

	// calculate starting velocity vector from angle and velocity
	var vx = velocity * Math.cos(angle_rad);
	var vy = velocity * Math.sin(angle_rad);

	// flight time is always positive (hopefully) and sometimes infinite
	var total_time = calcTimeOfFlight(velocity, angle, gravity, ground_y, pole_y);
	if(gravity == 0)
	{
		if(velocity == 0) // no movement
		{
			return;
		}
		if(angle <= 180) // aiming into the abyss
		{
			context.lineTo((x0 + vx * 1000), (y0 - vy * 1000));
		}
		else // aiming to the ground, straight line diagonal to the horizontal ground level
		{
			context.lineTo(x0 + pole_height * ctan(-angle_rad), y0 + pole_height);
		}
	}
	else if(gravity < 0) // what have I done...
	{
		if(angle > 180) // aiming to the ground
		{
			var max_height = vy*vy/(2.0*gravity); // it's always negative in this case
			if((pole_height + max_height) > 0) // velocity is too weak to reach the ground
			{
				for(var iter = 1; iter <= precision; iter++)
				{
					var time = iter * total_time / precision;
					var x = x0 + time * vx;
					var y = y0 - time * vy + 0.5 * gravity * time * time;

					context.lineTo(x, y); // the roof is actually a floor for us
				}
			}
			else // velocity fighting against the gravity and reaching the ground
			{
				for(var iter = 1; iter <= precision; iter++)
				{
					var time = iter * total_time / precision;
					var x = x0 + time * vx;
					var y = y0 - time * vy + 0.5 * gravity * time * time;
					if(y >= ground_y) // hitting the ground, starting the new line with adjusted params
					{						
						// ground_y-y = elevation of the last point before touchdown
						var hit_x = x + (ground_y-y) * ctan(-angle_rad);
						var hit_y = ground_y;
						var hit_vy = -vy + gravity * time;
						var hit_rad = Math.atan(hit_vy/vx);
						var hit_angle = hit_rad * 180.0 / Math.PI;
						var bounce_angle = hit_angle;
						var hit_velocity = Math.sqrt(vx*vx + hit_vy*hit_vy);

						context.lineTo(hit_x, hit_y);
						context.stroke();

						// pole height here is 0, because we imitate that the ball starts from the ground level
						drawPath(context, cw, ch, bounce_angle, hit_velocity, gravity, 0, ground_height, precision, hit_x);
						return;
					}
					else
					{
						context.lineTo(x, y);
					}
				}
			}
		}
		else // aiming into the abyss!
		{
			for(var iter = 1; iter <= precision; iter++)
			{
				var time = iter * total_time / precision;
				var x = x0 + time * vx;
				var y = y0 - time * vy + 0.5 * gravity * time * time;
				
				context.lineTo(x, y); // the roof is actually a floor for us
			}
		}
	}
	else // normal, boring case
	{
		for(var iter = 1; iter <= precision; iter++)
		{
			var time = iter * total_time / precision;
			var x = x0 + time * vx;
			var y = y0 - time * vy + 0.5 * gravity * (time * time); // in canvas Y-axis is inverted
			context.lineTo(x, y);
		}
	}
	context.stroke();
}

function calcTimeOfFlight(velocity, angle, grav_acc, ground_y, start_y)
{
	var elevation = ground_y - start_y; // Y-axis is inverted
	var vy = velocity * Math.sin(angle * Math.PI / 180.0);
	if(elevation < 0) // sanity check if start is underground
	{
		return 0;
	}
	if(grav_acc == 0) // zeee - rooo... gravity!
	{
		if(velocity == 0) // levitating forever
		{
			return Infinity;
		}
		else if(angle <= 180) // endlessly flying
		{
			return Infinity;
		}
		else // aiming to the ground, there is hope!
		{
			// we have h and angle, this is everything we need

			// let's form a right triangle
			// x is horizontal, h vertical, s is the trajectory (hypotenuse)
			// sin(angle) = h/s, cos(angle) = x/s
			// tg(angle) = sin/cos = h/s * s/x = h/x
			// x = h / tg(angle)
			// cos(angle) = x/s = h/tg(angle) * 1/s
			// s = h/tg(angle) * 1/cos(angle) = h / sin(angle)
			// v = s * t
			// t = v / s = v * sin(angle) / h
			return velocity * Math.sin(angle * Math.PI / 180.0) / elevation;
		}
	}
	else if(grav_acc < 0)
	{
		// ascension time means going down, descension going up
		var max_height = vy*vy/(2.0*grav_acc);
		if(angle > 180) // aiming to the ground, there is hope!
		{
			if((elevation + max_height) > 0) // velocity is too weak to reach the ground
			{
				// calculate time to reach the roof of the chart
				var ascension_time = vy / grav_acc;
				var descension_time = Math.sqrt(vy*vy + 2.0 * Math.abs(grav_acc) * (start_y)) / grav_acc; // temporary fix with 1000
				return ascension_time - descension_time; // both values are negative, so inverting
			}
			else // velocity powerful enough to hit the ground against the gravity
			{
				// no descension time
				var ascension_time = vy / grav_acc;
				return ascension_time;
			}
		}
		else // going into the abyss
		{
			// calculate time to reach the roof of the chart
			var ascension_time = vy / grav_acc;
			var descension_time = Math.sqrt(vy*vy + 2.0 * Math.abs(grav_acc) * (600 - elevation)) / grav_acc;
			return -ascension_time - descension_time; // both values are negative, so inverting
		}
	}
	else
	{
		// normal, boring case
		var ascension_time = vy / grav_acc;
		var descension_time = Math.sqrt(vy*vy + 2.0 * grav_acc * elevation) / grav_acc;
		return ascension_time + descension_time;
	}
}

function ctan(a) // js does not have cotangent...
{
	return 1.0 / Math.tan(a);
}
